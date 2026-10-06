import type {
  CoverageKey,
  Offer,
  QuoteRequest,
  ServiceKey,
  VehicleType,
  VehicleUse,
} from "@/domain/types";
import { InsurerUnavailableError, type InsurerAdapter, type RegulatoryInfo } from "../adapter";

/** Definición de un plan dentro de una aseguradora simulada. */
export interface MockPlan {
  code: string;
  name: string;
  vehicleType: VehicleType;
  /** Tasa anual sobre el valor comercial (planes con daños/hurto). */
  rate: number;
  /** Prima fija anual en COP (planes solo RC). */
  basePremium: number;
  rcLimit: number;
  coverages: CoverageKey[];
  deductiblePct: number;
  deductibleMinSmmlv: number;
  services: ServiceKey[];
  substituteCarDays: number;
  exclusions: string[];
  /** Usos aceptados. Si se omite, el plan acepta todos. */
  allowedUses?: VehicleUse[];
}

export interface MockInsurerConfig {
  id: string;
  name: string;
  latencyMs: [number, number];
  /** Recargo/descuento por ciudad (1 = neutro). */
  cityFactor: Record<string, number>;
  plans: MockPlan[];
  /** Placas que fuerzan error, para probar resultados parciales. */
  failPlatePrefix?: string;
  /** Placas cuya primera emisión falla, para probar los reintentos. */
  failIssuePlatePrefix?: string;
  regulatory: RegulatoryInfo;
}

const CURRENT_YEAR = 2026;

/** IVA sobre primas de seguros de vehículos en Colombia. */
export const IVA_RATE = 0.19;

export const COMMON_EXCLUSIONS = [
  "Conducir bajo efectos del alcohol o sustancias",
  "Conductor sin licencia vigente para la categoría",
  "Participar en carreras o competencias",
  "Uso distinto al declarado (por ejemplo, transporte público no declarado)",
];

/** Hash determinístico para dar variación estable a una cotización. */
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function age(birthdate: string): number {
  const b = new Date(birthdate);
  const now = new Date(`${CURRENT_YEAR}-10-01`);
  let a = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
}

function riskFactor(req: QuoteRequest, config: MockInsurerConfig): number {
  const { vehicle, driver, answers } = req;
  let f = 1;
  const a = age(driver.birthdate);
  if (a < 25) f *= 1.35;
  else if (a < 30) f *= 1.12;
  else if (a > 65) f *= 1.15;

  const vehicleAge = CURRENT_YEAR - vehicle.year;
  if (vehicleAge > 10) f *= 1.15;
  else if (vehicleAge <= 2) f *= 0.95;

  if (answers.use === "trabajo") f *= 1.2;
  if (answers.use === "domicilios") f *= vehicle.type === "moto" ? 1.45 : 1.3;
  if (answers.parking === "calle") f *= 1.12;
  if (answers.mileage === "bajo") f *= 0.9;
  if (answers.mileage === "alto") f *= 1.15;
  if (answers.drivers === "varios") f *= 1.08;
  f *= 1 + Math.min(answers.claimsLast3Years, 3) * 0.15;
  f *= config.cityFactor[driver.city] ?? 1;
  return f;
}

function roundTo(n: number, step: number) {
  return Math.round(n / step) * step;
}

export function priceOffers(
  req: QuoteRequest,
  config: MockInsurerConfig,
): Offer[] {
  const risk = riskFactor(req, config);
  const jitter =
    0.94 + hash(`${config.id}|${req.vehicle.brand}|${req.vehicle.year}`) * 0.12;
  const validUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 15)
    .toISOString()
    .slice(0, 10);

  return config.plans
    .filter((p) => p.vehicleType === req.vehicle.type)
    .map((plan) => {
      const annual = roundTo(
        (plan.basePremium + plan.rate * req.vehicle.commercialValue) *
          risk *
          jitter,
        1000,
      );
      const netPremium = Math.round(annual / (1 + IVA_RATE));
      return {
        id: `${config.id}:${plan.code}`,
        insurerId: config.id,
        insurerName: config.name,
        planName: plan.name,
        vehicleType: plan.vehicleType,
        annualPremium: annual,
        // Pago mensual con recargo de financiación del 6%.
        monthlyPremium: roundTo((annual * 1.06) / 12, 100),
        rcLimit: plan.rcLimit,
        coverages: Object.fromEntries(
          [
            "rc",
            "perdidaTotalDanos",
            "perdidaParcialDanos",
            "perdidaTotalHurto",
            "perdidaParcialHurto",
            "eventosNaturaleza",
            "accidentesPersonales",
          ].map((k) => [k, plan.coverages.includes(k as CoverageKey)]),
        ) as Record<CoverageKey, boolean>,
        deductiblePct: plan.deductiblePct,
        deductibleMinSmmlv: plan.deductibleMinSmmlv,
        services: plan.services,
        substituteCarDays: plan.substituteCarDays,
        netPremium,
        iva: annual - netPremium,
        exclusions: [...COMMON_EXCLUSIONS, ...plan.exclusions],
        conditionsUrl: `/condicionado/${config.id}/${plan.code}`,
        validUntil,
        ...(plan.allowedUses && { allowedUses: plan.allowedUses }),
      };
    });
}

// Estado de la aseguradora simulada: emisiones hechas por clave de idempotencia.
const g = globalThis as unknown as { __safMockIssued?: Map<string, string>; __safMockIssueAttempts?: Map<string, number> };
const mockIssued = () => (g.__safMockIssued ??= new Map());
const mockIssueAttempts = () => (g.__safMockIssueAttempts ??= new Map());

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(signal.reason);
    });
  });
}

export function createMockAdapter(config: MockInsurerConfig): InsurerAdapter {
  return {
    id: config.id,
    name: config.name,
    supports: [...new Set(config.plans.map((p) => p.vehicleType))],
    regulatory: config.regulatory,
    async quote(req, signal) {
      const [min, max] = config.latencyMs;
      const latency =
        min + hash(`${config.id}|${req.vehicle.plate ?? ""}`) * (max - min);
      await sleep(latency, signal);
      if (
        config.failPlatePrefix &&
        req.vehicle.plate?.startsWith(config.failPlatePrefix)
      ) {
        throw new InsurerUnavailableError(
          `${config.name} no respondió. Intenta de nuevo más tarde.`,
        );
      }
      return priceOffers(req, config);
    },
    async issue(req) {
      const issued = mockIssued();
      const prev = issued.get(req.idempotencyKey);
      if (prev) return { policyNumber: prev };
      const attempts = (mockIssueAttempts().get(req.idempotencyKey) ?? 0) + 1;
      mockIssueAttempts().set(req.idempotencyKey, attempts);
      if (config.failIssuePlatePrefix && req.quote.vehicle.plate?.startsWith(config.failIssuePlatePrefix) && attempts === 1) {
        throw new InsurerUnavailableError(`${config.name} no pudo emitir en este momento.`);
      }
      const serial = Math.floor(
        hash(`${req.offer.id}|${req.holder.documentNumber}|${req.startDate}|${Date.now()}`) * 1e8,
      )
        .toString()
        .padStart(8, "0");
      const line = req.offer.vehicleType === "auto" ? "AU" : "MO";
      const policyNumber = `${config.id.toUpperCase().slice(0, 3)}-${line}-${serial}`;
      issued.set(req.idempotencyKey, policyNumber);
      return { policyNumber };
    },
  };
}
