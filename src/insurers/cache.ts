import type { InsurerError, Offer, QuoteRequest } from "@/domain/types";
import { quoteAll } from "./aggregator";

// Caché en memoria de cotizaciones. La clave solo incluye los datos que cambian
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

export async function quoteWithCache(
  req: QuoteRequest,
  now = Date.now(),
): Promise<{ offers: Offer[]; errors: InsurerError[]; cached: boolean }> {
  const key = tariffKey(req);
  const hit = cache().get(key);
  if (hit && hit.expiresAt > now) return { offers: hit.offers, errors: [], cached: true };

  const { offers, errors } = await quoteAll(req);
  // Los resultados parciales no se guardan: la próxima consulta reintenta.
  if (errors.length === 0) {
    if (cache().size >= MAX_ENTRIES) cache().delete(cache().keys().next().value!);
    cache().set(key, { offers, expiresAt: now + TTL_MS });
  } else {
    cache().delete(key);
  }
  return { offers, errors, cached: false };
}
