import "server-only";
import { COVERAGE_KEYS, type Offer, type ScoredOffer } from "@/domain/types";
import { quoteWithCache } from "@/insurers/cache";
import { recommend } from "@/recommendation/scoring";
import { db, type Policy } from "./db";
import { daysUntil } from "./queries";

/** Días antes del vencimiento en que buscamos una mejor opción. */
export const RENEWAL_WINDOW_DAYS = 45;
/** Ahorro mínimo para sugerir el cambio. */
const MIN_SAVINGS = 0.05;

export interface RenewalSuggestion {
  policy: Policy;
  offer: ScoredOffer;
  savings: number;
}

function coversAtLeast(offer: Offer, current: Offer) {
  return COVERAGE_KEYS.every((k) => !current.coverages[k] || offer.coverages[k]) && offer.rcLimit >= current.rcLimit;
}

/**
 * Re-cotiza las pólizas compradas en la plataforma que están por vencer y
 * devuelve las que tienen una opción con al menos la misma cobertura y un
 * ahorro de 5% o más frente a la prima actual.
 */
export async function renewalSuggestions(userId: string, now = new Date()): Promise<RenewalSuggestion[]> {
  const d = db();
  const out: RenewalSuggestion[] = [];
  for (const policy of d.policies.values()) {
    if (policy.userId !== userId || policy.status === "retractada" || !policy.annualPremium) continue;
    const left = daysUntil(policy.endDate, now);
    if (left < 0 || left > RENEWAL_WINDOW_DAYS) continue;
    const order = policy.orderId ? d.orders.get(policy.orderId) : undefined;
    if (!order) continue;
    const { offers } = await quoteWithCache(order.quote);
    // Solo ofertas elegibles para el uso y la financiación declarados, comparadas
    // contra la cobertura de la póliza que se compró.
    const { offers: scored } = recommend(offers, order.quote.answers);
    const current = order.offer;
    const best = scored
      .filter((o) => o.id !== order.offer.id && coversAtLeast(o, current))
      .sort((a, b) => a.annualPremium - b.annualPremium)[0];
    if (best && best.annualPremium <= policy.annualPremium * (1 - MIN_SAVINGS)) {
      out.push({ policy, offer: best, savings: policy.annualPremium - best.annualPremium });
    }
  }
  return out;
}
