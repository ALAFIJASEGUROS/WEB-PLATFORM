import type { InsurerError, Offer, QuoteRequest } from "@/domain/types";
import type { InsurerAdapter } from "./adapter";
import { quoteAll } from "./aggregator";
import { MOCK_INSURERS } from "./mock/insurers";

// Caché en memoria de cotizaciones, por aseguradora. La clave solo incluye los datos que cambian
// la tarifa: las preferencias (prioridad, pesos, servicios, deducible) solo
// afectan el puntaje, que se recalcula en cada consulta.

const TTL_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 500;

interface Entry {
  offers: Offer[];
  expiresAt: number;
}

const g = globalThis as unknown as { __safQuoteCache?: Map<string, Entry> };
const cache = () => (g.__safQuoteCache ??= new Map());

export function tariffKey(req: QuoteRequest) {
  const { vehicle: v, driver: d, answers: a } = req;
  return JSON.stringify([
    v.type, v.plate ?? "", v.brand, v.model, v.year, v.commercialValue, v.engineCc ?? 0,
    d.birthdate, d.city,
    a.use, a.parking, a.mileage, a.drivers, a.financed, a.claimsLast3Years,
  ]);
}

/**
 * Cotiza usando la caché por aseguradora: solo consulta las que no tienen una
 * cotización vigente. Si una falla, lo que respondieron las demás se guarda.
 * El TTL es el menor entre la política interna y la vigencia de la aseguradora.
 */
export async function quoteWithCache(
  req: QuoteRequest,
  now = Date.now(),
  adapters: InsurerAdapter[] = MOCK_INSURERS,
): Promise<{ offers: Offer[]; errors: InsurerError[]; cached: boolean }> {
  const key = tariffKey(req);
  const eligible = adapters.filter((a) => a.supports.includes(req.vehicle.type));
  const fresh = new Map<string, Offer[]>();
  for (const a of eligible) {
    const hit = cache().get(`${a.id}|${key}`);
    if (hit && hit.expiresAt > now) fresh.set(a.id, hit.offers);
  }
  const missing = eligible.filter((a) => !fresh.has(a.id));
  let errors: InsurerError[] = [];
  if (missing.length > 0) {
    const result = await quoteAll(req, missing);
    errors = result.errors;
    for (const a of missing) {
      if (errors.some((e) => e.insurerId === a.id)) {
        cache().delete(`${a.id}|${key}`);
        continue;
      }
      const offers = result.offers.filter((o) => o.insurerId === a.id);
      fresh.set(a.id, offers);
      if (cache().size >= MAX_ENTRIES) cache().delete(cache().keys().next().value!);
      const ttl = Math.min(TTL_MS, a.capabilities.quoteTtlMinutes * 60_000);
      cache().set(`${a.id}|${key}`, { offers, expiresAt: now + ttl });
    }
  }
  const offers = eligible.flatMap((a) => fresh.get(a.id) ?? []);
  return { offers, errors, cached: missing.length === 0 };
}
