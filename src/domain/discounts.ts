// Motor de descuentos y tarifas especiales.
//
// Cada regla se prende o apaga y se parametriza por aseguradora: quién la
// financia (la aseguradora o la plataforma), el tipo (porcentaje o valor fijo),
// la magnitud, un tope en pesos, la vigencia y a qué vehículos o planes aplica.
// Encima, la configuración global define el apetito de descuento: un interruptor
// general y el máximo que puede bajar el precio sumando todas las reglas.

import { priceBreakdown } from "./pricing";
import type { Offer, VehicleType } from "./types";

export type DiscountSource = "aseguradora" | "plataforma";
export type DiscountKind = "porcentaje" | "valor";

export interface DiscountRule {
  id: string;
  /** Aseguradora a la que aplica, o "*" para todas. */
  insurerId: string;
  /** Nombre visible para el usuario, p. ej. "Tarifa preferencial SeguAlaFija". */
  label: string;
  /** Quién asume el descuento: la aseguradora (tarifa especial) o la plataforma (de su comisión). */
  source: DiscountSource;
  kind: DiscountKind;
  /** Porcentaje (0–100) o valor en COP, según `kind`. */
  magnitude: number;
  /** Tope del descuento en COP. */
  maxAmount?: number;
  enabled: boolean;
  vehicleTypes?: VehicleType[];
  /** Códigos de plan (la parte después de ":" en el id de la oferta). */
  planCodes?: string[];
  /** Vigencia en fechas ISO (inclusive). */
  validFrom?: string;
  validUntil?: string;
}

export interface DiscountSettings {
  /** Interruptor general: si está apagado no se aplica ninguna regla. */
  enabled: boolean;
  /** Descuento total máximo sobre la prima, en porcentaje (apetito de descuento). */
  maxTotalPct: number;
}

export interface AppliedDiscount {
  ruleId: string;
  label: string;
  source: DiscountSource;
  amount: number;
}

export const DEFAULT_DISCOUNT_SETTINGS: DiscountSettings = { enabled: true, maxTotalPct: 15 };

/**
 * Reglas iniciales de ejemplo. En la versión con servidor se editan desde
 * /admin; en la demo estática se usan tal cual.
 */
export const DEFAULT_DISCOUNT_RULES: DiscountRule[] = [
  {
    id: "sura-digital",
    insurerId: "sura",
    label: "Tarifa digital SURA",
    source: "aseguradora",
    kind: "porcentaje",
    magnitude: 5,
    enabled: true,
  },
  {
    id: "bolivar-motos",
    insurerId: "bolivar",
    label: "Descuento motos Bolívar",
    source: "aseguradora",
    kind: "porcentaje",
    magnitude: 8,
    maxAmount: 60_000,
    enabled: true,
    vehicleTypes: ["moto"],
  },
  {
    id: "plataforma-bienvenida",
    insurerId: "*",
    label: "Bono de bienvenida SeguAlaFija",
    source: "plataforma",
    kind: "valor",
    magnitude: 30_000,
    enabled: false,
  },
];

function applies(rule: DiscountRule, offer: Offer, today: string) {
  if (!rule.enabled || rule.magnitude <= 0) return false;
  if (rule.insurerId !== "*" && rule.insurerId !== offer.insurerId) return false;
  if (rule.vehicleTypes?.length && !rule.vehicleTypes.includes(offer.vehicleType)) return false;
  if (rule.planCodes?.length && !rule.planCodes.includes(offer.id.split(":")[1])) return false;
  if (rule.validFrom && today < rule.validFrom) return false;
  if (rule.validUntil && today > rule.validUntil) return false;
  return true;
}

/** Los descuentos se expresan en miles, como las tarifas, para que lista − descuentos = precio final. */
const toThousands = (n: number) => Math.floor(n / 1000) * 1000;

function ruleAmount(rule: DiscountRule, base: number) {
  const raw = rule.kind === "porcentaje" ? (base * Math.min(rule.magnitude, 100)) / 100 : rule.magnitude;
  return toThousands(Math.min(raw, rule.maxAmount ?? Infinity, base));
}

/**
 * Aplica las reglas vigentes a una oferta. De cada fuente se toma solo la regla
 * más favorable (no se acumulan dos de la aseguradora); las de distinta fuente
 * sí se suman, hasta el tope global.
 */
export function applyDiscounts(
  offer: Offer,
  rules: DiscountRule[],
  settings: DiscountSettings,
  today = new Date().toISOString().slice(0, 10),
): Offer {
  const base = offer.listPremium ?? offer.annualPremium;
  if (!settings.enabled) return offer;
  const best = new Map<DiscountSource, AppliedDiscount>();
  for (const rule of rules) {
    if (!applies(rule, offer, today)) continue;
    const amount = ruleAmount(rule, base);
    if (amount > (best.get(rule.source)?.amount ?? 0)) {
      best.set(rule.source, { ruleId: rule.id, label: rule.label, source: rule.source, amount });
    }
  }
  if (best.size === 0) return offer;

  // Tope global: si la suma lo supera, se recorta primero lo que pone la plataforma.
  let room = toThousands((base * Math.max(0, Math.min(settings.maxTotalPct, 100))) / 100);
  const applied: AppliedDiscount[] = [];
  for (const source of ["aseguradora", "plataforma"] as const) {
    const d = best.get(source);
    if (!d || room <= 0) continue;
    const amount = Math.min(d.amount, room);
    room -= amount;
    applied.push({ ...d, amount });
  }
  const total = applied.reduce((s, d) => s + d.amount, 0);
  if (total <= 0) return offer;
  const annual = base - total;
  return { ...offer, ...priceBreakdown(annual), listPremium: base, discounts: applied };
}

export function applyDiscountsToAll(offers: Offer[], rules: DiscountRule[], settings: DiscountSettings, today?: string) {
  return offers.map((o) => applyDiscounts(o, rules, settings, today));
}

export const discountTotal = (o: Pick<Offer, "discounts">) => (o.discounts ?? []).reduce((s, d) => s + d.amount, 0);

const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`;

/** Resumen legible de una regla, para el panel y la bitácora. */
export function describeRule(r: DiscountRule) {
  const size = r.kind === "porcentaje" ? `${r.magnitude}%` : fmt(r.magnitude);
  const parts = [
    `${r.label}: ${size}`,
    r.maxAmount && `tope ${fmt(r.maxAmount)}`,
    r.insurerId === "*" ? "todas las aseguradoras" : r.insurerId,
    r.vehicleTypes?.length && r.vehicleTypes.join("/"),
    r.planCodes?.length && `planes ${r.planCodes.join(", ")}`,
    (r.validFrom || r.validUntil) && `vigencia ${r.validFrom ?? "…"} a ${r.validUntil ?? "…"}`,
    `asume ${r.source}`,
  ];
  return parts.filter(Boolean).join(" · ");
}
