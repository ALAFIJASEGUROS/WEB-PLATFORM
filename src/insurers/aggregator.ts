import type { InsurerError, Offer, QuoteRequest } from "@/domain/types";
import { InsurerUnavailableError, type InsurerAdapter } from "./adapter";
import { MOCK_INSURERS } from "./mock/insurers";
import { acquire, record } from "./resilience";

/** Timeout por defecto de cada cotización, si la aseguradora no declara uno. */
export const DEFAULT_TIMEOUT_MS = 4000;
/** Tiempo máximo total de una cotización, contando el reintento. */
export const QUOTE_BUDGET_MS = 8000;
/** Margen mínimo de presupuesto para que valga la pena reintentar. */
const MIN_RETRY_MS = 1000;

export function getAdapter(insurerId: string, adapters = MOCK_INSURERS) {
  return adapters.find((a) => a.id === insurerId);
}

export interface QuoteAllOptions {
  /** Fuerza el timeout de cada intento (pruebas). */
  timeoutMs?: number;
  budgetMs?: number;
  /** Desactiva el reintento (pruebas). */
  retry?: boolean;
}

const isTimeout = (e: unknown) => e instanceof DOMException && e.name === "TimeoutError";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class CircuitOpenError extends Error {}

/**
 * Cotiza con una aseguradora: timeout propio, circuit breaker y un reintento
 * con espera aleatoria solo ante errores técnicos, dentro del presupuesto.
 */
async function quoteOne(adapter: InsurerAdapter, req: QuoteRequest, deadline: number, opts: QuoteAllOptions) {
  const timeout = opts.timeoutMs ?? adapter.capabilities.quoteTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = opts.retry === false ? 1 : 2;
  for (let attempt = 1; ; attempt++) {
    if (!acquire(adapter.id)) throw new CircuitOpenError();
    const remaining = deadline - Date.now();
    const started = Date.now();
    try {
      const offers = await adapter.quote(req, AbortSignal.timeout(Math.max(1, Math.min(timeout, remaining))));
      record(adapter.id, "ok", Date.now() - started);
      return offers;
    } catch (e) {
      const timedOut = isTimeout(e);
      record(adapter.id, timedOut ? "timeout" : "error", Date.now() - started, e instanceof Error ? e.message : String(e));
      // Un timeout ya consumió el tiempo: no se reintenta. Tampoco errores que no sean técnicos.
      const retriable = !timedOut && e instanceof InsurerUnavailableError && attempt < maxAttempts;
      const backoff = 150 + Math.random() * 250;
      if (!retriable || deadline - Date.now() - backoff < MIN_RETRY_MS) throw e;
      await sleep(backoff);
    }
  }
}

/**
 * Consulta todas las aseguradoras en paralelo. Si alguna falla, se demora más
 * que su timeout o tiene el circuito abierto, se devuelven los resultados
 * parciales y el error.
 */
export async function quoteAll(
  req: QuoteRequest,
  adapters: InsurerAdapter[] = MOCK_INSURERS,
  timeoutOrOptions?: number | QuoteAllOptions,
): Promise<{ offers: Offer[]; errors: InsurerError[] }> {
  const opts: QuoteAllOptions =
    typeof timeoutOrOptions === "number" ? { timeoutMs: timeoutOrOptions } : (timeoutOrOptions ?? {});
  const deadline = Date.now() + (opts.budgetMs ?? QUOTE_BUDGET_MS);
  const eligible = adapters.filter((a) => a.supports.includes(req.vehicle.type));

  const results = await Promise.allSettled(eligible.map((adapter) => quoteOne(adapter, req, deadline, opts)));

  const offers: Offer[] = [];
  const errors: InsurerError[] = [];
  results.forEach((r, i) => {
    const adapter = eligible[i];
    if (r.status === "fulfilled") {
      offers.push(...r.value);
      return;
    }
    const base = { insurerId: adapter.id, insurerName: adapter.name };
    if (r.reason instanceof CircuitOpenError) {
      errors.push({ ...base, kind: "no_disponible", message: `${adapter.name} no está disponible en este momento.` });
    } else if (isTimeout(r.reason)) {
      errors.push({ ...base, kind: "timeout", message: `${adapter.name} tardó demasiado en responder.` });
    } else {
      errors.push({
        ...base,
        kind: "error",
        message: r.reason instanceof InsurerUnavailableError ? r.reason.message : `${adapter.name} no está disponible.`,
      });
    }
  });
  return { offers, errors };
}
