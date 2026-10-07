import "server-only";
import { FUNNEL_EVENTS, type AnalyticsEvent } from "@/domain/events";
import type { WeightExperiment } from "@/recommendation/experiments";
import type { Order, OrderStatus } from "./db";

export interface StoredEvent {
  event: AnalyticsEvent;
  sid: string;
  props: Record<string, string | number | boolean>;
  at: string;
}

const MAX_EVENTS = 20_000;
const g = globalThis as unknown as { __safEvents?: StoredEvent[] };
const events = () => (g.__safEvents ??= []);

export function recordEvent(event: AnalyticsEvent, sid: string, props: StoredEvent["props"] = {}) {
  const list = events();
  list.push({ event, sid, props, at: new Date().toISOString() });
  if (list.length > MAX_EVENTS) list.splice(0, list.length - MAX_EVENTS);
}

/** Sesiones únicas que llegaron a cada paso del embudo. */
export function funnel() {
  const bySid = new Map<string, Set<AnalyticsEvent>>();
  for (const e of events()) {
    if (!bySid.has(e.sid)) bySid.set(e.sid, new Set());
    bySid.get(e.sid)!.add(e.event);
  }
  const counts = FUNNEL_EVENTS.map((step) => ({
    step,
    sessions: [...bySid.values()].filter((s) => s.has(step)).length,
  }));
  return counts.map((c, i) => ({
    ...c,
    fromPrevious: i === 0 || counts[i - 1].sessions === 0 ? null : c.sessions / counts[i - 1].sessions,
  }));
}

/** Conteo de un evento agrupado por una propiedad (p. ej. aseguradora elegida). */
export function breakdown(event: AnalyticsEvent, prop: string) {
  const acc: Record<string, number> = {};
  for (const e of events()) {
    if (e.event !== event) continue;
    const k = String(e.props[prop] ?? "—");
    acc[k] = (acc[k] ?? 0) + 1;
  }
  return Object.entries(acc).sort((a, b) => b[1] - a[1]);
}

// ── Experimentos A/B ───────────────────────────────────────────────────────

export interface VariantResult {
  variantId: string;
  label: string;
  exposed: number;
  choseRecommended: number;
  checkout: number;
  paid: number;
  /** Compras / sesiones expuestas. */
  conversion: number | null;
  /** Valor p (dos colas) de la conversión frente al control; null si no aplica. */
  pValue: number | null;
}

/** Mínimo de sesiones por variante antes de mirar el valor p. */
export const MIN_SAMPLE = 100;

/** Función de distribución normal estándar (aproximación de Abramowitz-Stegun). */
function normalCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

/** Prueba z de dos proporciones (dos colas). */
export function twoProportionPValue(x1: number, n1: number, x2: number, n2: number) {
  if (!n1 || !n2) return null;
  const p = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  if (se === 0) return null;
  const z = (x1 / n1 - x2 / n2) / se;
  return 2 * (1 - normalCdf(Math.abs(z)));
}

/**
 * Resultados de un experimento. La exposición se toma de `resultados_vistos`
 * con la etiqueta de variante; el resto del embudo se cruza por sesión.
 */
export function experimentResults(experiment: WeightExperiment): VariantResult[] {
  const exposure = new Map<string, string>();
  const reached = new Map<string, Set<AnalyticsEvent>>();
  const choseRec = new Set<string>();
  for (const e of events()) {
    if (e.event === "resultados_vistos" && typeof e.props.variante === "string" && !exposure.has(e.sid)) {
      const [expId, variantId] = e.props.variante.split(":");
      if (expId === experiment.id) exposure.set(e.sid, variantId);
    }
    if (!reached.has(e.sid)) reached.set(e.sid, new Set());
    reached.get(e.sid)!.add(e.event);
    if (e.event === "oferta_elegida" && e.props.recomendado === true) choseRec.add(e.sid);
  }
  const rows = experiment.variants.map((v) => {
    const sids = [...exposure].filter(([, id]) => id === v.id).map(([sid]) => sid);
    const has = (ev: AnalyticsEvent) => sids.filter((s) => reached.get(s)?.has(ev)).length;
    const paid = has("pago_aprobado");
    return {
      variantId: v.id,
      label: v.label,
      exposed: sids.length,
      choseRecommended: sids.filter((s) => choseRec.has(s)).length,
      checkout: has("checkout_enviado"),
      paid,
      conversion: sids.length ? paid / sids.length : null,
      pValue: null as number | null,
    };
  });
  const control = rows[0];
  for (const r of rows.slice(1)) r.pValue = twoProportionPValue(r.paid, r.exposed, control.paid, control.exposed);
  return rows;
}

// ── Impacto de los descuentos ──────────────────────────────────────────────

export interface DiscountImpactRow {
  key: string;
  label: string;
  source?: "aseguradora" | "plataforma";
  chosen: number;
  orders: number;
  paid: number;
  /** Pagadas / elegidas. */
  conversion: number | null;
  /** Descuento otorgado en compras pagadas (COP). */
  granted: number;
  /** Prima anual cobrada en compras pagadas (COP). */
  premium: number;
}

export const NO_DISCOUNT = "sin-descuento";
const PAID: ReadonlySet<OrderStatus> = new Set(["aprobada", "emitida"]);

/** Elección, compra, costo y prima por regla de descuento (y sin descuento, para comparar). */
export function discountImpact(orders: Order[], labels: Record<string, string> = {}): DiscountImpactRow[] {
  const rows = new Map<string, DiscountImpactRow>();
  const row = (key: string, label?: string) => {
    if (!rows.has(key)) {
      rows.set(key, { key, label: label ?? labels[key] ?? key, chosen: 0, orders: 0, paid: 0, conversion: null, granted: 0, premium: 0 });
    }
    return rows.get(key)!;
  };
  row(NO_DISCOUNT, "Sin descuento");
  for (const e of events()) {
    if (e.event !== "oferta_elegida") continue;
    const ids = typeof e.props.descuentos === "string" ? e.props.descuentos.split(",").filter(Boolean) : [];
    for (const id of ids.length ? ids : [NO_DISCOUNT]) row(id).chosen++;
  }
  for (const o of orders) {
    const discounts = o.offer.discounts ?? [];
    const paid = PAID.has(o.status);
    const targets = discounts.length ? discounts : [{ ruleId: NO_DISCOUNT, label: "Sin descuento", amount: 0, source: undefined }];
    for (const d of targets) {
      const r = row(d.ruleId, labels[d.ruleId] ?? d.label);
      if (d.source) r.source = d.source;
      r.orders++;
      if (paid) {
        r.paid++;
        r.granted += d.amount;
        r.premium += o.offer.annualPremium;
      }
    }
  }
  return [...rows.values()]
    .map((r) => ({ ...r, conversion: r.chosen ? r.paid / r.chosen : null }))
    .sort((a, b) => (a.key === NO_DISCOUNT ? 1 : b.key === NO_DISCOUNT ? -1 : b.paid - a.paid));
}
