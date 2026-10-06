import type { InsurerError, Offer, QuoteRequest } from "@/domain/types";
import type { InsurerAdapter } from "./adapter";
import { MOCK_INSURERS } from "./mock/insurers";

const DEFAULT_TIMEOUT_MS = 4000;

/**
 * Consulta todas las aseguradoras en paralelo. Si alguna falla o se demora
 * más que el timeout, se devuelven los resultados parciales y el error.
 */
export async function quoteAll(
  req: QuoteRequest,
  adapters: InsurerAdapter[] = MOCK_INSURERS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<{ offers: Offer[]; errors: InsurerError[] }> {
  const eligible = adapters.filter((a) => a.supports.includes(req.vehicle.type));

  const results = await Promise.allSettled(
    eligible.map((adapter) =>
      adapter.quote(req, AbortSignal.timeout(timeoutMs)),
    ),
  );

  const offers: Offer[] = [];
  const errors: InsurerError[] = [];
  results.forEach((r, i) => {
    const adapter = eligible[i];
    if (r.status === "fulfilled") {
      offers.push(...r.value);
    } else {
      const timedOut =
        r.reason instanceof DOMException && r.reason.name === "TimeoutError";
      errors.push({
        insurerId: adapter.id,
        insurerName: adapter.name,
        message: timedOut
          ? `${adapter.name} tardó demasiado en responder.`
          : r.reason instanceof Error
            ? r.reason.message
            : `${adapter.name} no está disponible.`,
      });
    }
  });
  return { offers, errors };
}
