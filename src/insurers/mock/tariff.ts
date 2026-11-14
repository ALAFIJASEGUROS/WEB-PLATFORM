import type {
  CoverageKey,
  Offer,
  QuoteRequest,
  ServiceKey,
  VehicleType,
  VehicleUse,
} from "@/domain/types";
import { priceBreakdown } from "@/domain/pricing";
import {
  ADAPTER_CONTRACT_VERSION,
  InsurerUnavailableError,
  type AdapterCapabilities,
  type InsurerAdapter,
  type IssueResult,
  type RegulatoryInfo,
} from "../adapter";

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
  /** Cilindraje máximo que asegura (motos). */
  maxEngineCc?: number;
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
  /** Placas que la aseguradora rechaza al emitir (rechazo de suscripción). */
  rejectIssuePlatePrefix?: string;
  /** Placas cuya emisión queda pendiente en el primer intento (emisión asíncrona). */
  pendingIssuePlatePrefix?: string;
  capabilities: AdapterCapabilities;
  regulatory: RegulatoryInfo;
}

const CURRENT_YEAR = 2026;


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

  // Motos: a más cilindraje, más valor de reparación y más riesgo de hurto.
  if (vehicle.type === "moto" && vehicle.engineCc) {
    if (vehicle.engineCc > 250) f *= 1.2;
    else if (vehicle.engineCc > 125) f *= 1.08;
  }
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
  const validUntil = new Date(Date.now() + 1000 * 60 * config.capabilities.quoteTtlMinutes)
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
      return {
        id: `${config.id}:${plan.code}`,
        insurerId: config.id,
        insurerName: config.name,
        planName: plan.name,
        vehicleType: plan.vehicleType,
        ...priceBreakdown(annual),
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
        exclusions: [...COMMON_EXCLUSIONS, ...plan.exclusions],
        conditionsUrl: `/condicionado/${config.id}/${plan.code}`,
        validUntil,
        ...(plan.allowedUses && { allowedUses: plan.allowedUses }),
        ...(plan.maxEngineCc && { maxEngineCc: plan.maxEngineCc }),
      };
    });
}

// Estado de la aseguradora simulada: emisiones hechas por clave de idempotencia.
const g = globalThis as unknown as { __safMockIssued?: Map<string, IssueResult>; __safMockIssueAttempts?: Map<string, number> };
const mockIssued = () => (g.__safMockIssued ??= new Map());
const mockIssueAttempts = () => (g.__safMockIssueAttempts ??= new Map());

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(signal.reason);
    });
  });
}

export function createMockAdapter(config: MockInsurerConfig): InsurerAdapter {
  const prefix = config.id.toUpperCase().slice(0, 3);
  return {
    id: config.id,
    name: config.name,
    contractVersion: ADAPTER_CONTRACT_VERSION,
    supports: [...new Set(config.plans.map((p) => p.vehicleType))],
    capabilities: config.capabilities,
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
      if (prev && prev.status !== "pendiente") return prev;
      const attempts = (mockIssueAttempts().get(req.idempotencyKey) ?? 0) + 1;
      mockIssueAttempts().set(req.idempotencyKey, attempts);
      const plate = req.quote.vehicle.plate ?? "";
      const startsWith = (p?: string) => !!p && plate.startsWith(p);
      if (startsWith(config.failIssuePlatePrefix) && attempts === 1) {
        throw new InsurerUnavailableError(`${config.name} no pudo emitir en este momento.`);
      }
      if (startsWith(config.rejectIssuePlatePrefix)) {
        const result: IssueResult = { status: "rechazada", reason: `${config.name} no asegura este vehículo.` };
        issued.set(req.idempotencyKey, result);
        return result;
      }
      if (startsWith(config.pendingIssuePlatePrefix) && attempts === 1) {
        const result: IssueResult = { status: "pendiente", externalId: `${prefix}-SOL-${req.idempotencyKey}` };
        issued.set(req.idempotencyKey, result);
        return result;
      }
      const serial = Math.floor(
        hash(`${req.offer.id}|${req.holder.documentNumber}|${req.startDate}|${Date.now()}`) * 1e8,
      )
        .toString()
        .padStart(8, "0");
      const line = req.offer.vehicleType === "auto" ? "AU" : "MO";
      const result: IssueResult = { status: "emitida", policyNumber: `${prefix}-${line}-${serial}` };
      issued.set(req.idempotencyKey, result);
      return result;
    },
    async getIssueStatus(idempotencyKey) {
      return mockIssued().get(idempotencyKey) ?? null;
    },
    async getPolicyDocument(policyNumber) {
      const exists = [...mockIssued().values()].some(
        (r) => r.status === "emitida" && r.policyNumber === policyNumber,
      );
      if (!exists) throw new Error(`${config.name}: la póliza ${policyNumber} no existe.`);
      return {
        contentType: "text/plain; charset=utf-8",
        data: new TextEncoder().encode(
          `Póliza SIMULADA ${policyNumber} de ${config.name}. Documento de prueba sin validez.`,
        ),
        conditionsVersion: "simulado-1",
      };
    },
    async healthcheck() {
      return { ok: true, latencyMs: 0, detail: "Aseguradora simulada" };
    },
  };
}
