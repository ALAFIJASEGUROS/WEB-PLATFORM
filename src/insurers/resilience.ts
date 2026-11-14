// Resiliencia por aseguradora: circuit breaker y métricas de salud.
//
// El estado vive en memoria (`globalThis`), así que cada instancia serverless
// tiene el suyo. Basta para proteger una instancia de una aseguradora caída;
// cuando exista Postgres o Redis (HU-09.6) conviene compartirlo.

export type BreakerState = "cerrado" | "abierto" | "semiabierto";
export type CallOutcome = "ok" | "error" | "timeout" | "rechazo";

/** Fallas técnicas seguidas que abren el circuito. */
export const BREAKER_FAILURE_THRESHOLD = 5;
/** Tiempo que el circuito queda abierto antes de dejar pasar una prueba. */
export const BREAKER_OPEN_MS = 60_000;
const LATENCY_WINDOW = 200;

interface InsurerState {
  consecutiveFailures: number;
  openedAt?: number;
  /** Hay una llamada de prueba en curso con el circuito semiabierto. */
  probing: boolean;
  calls: number;
  errors: number;
  timeouts: number;
  rejections: number;
  /** Latencias recientes de llamadas que respondieron (ok o rechazo). */
  latencies: number[];
  lastError?: string;
  lastErrorAt?: number;
  lastSuccessAt?: number;
}

const g = globalThis as unknown as { __safInsurerHealth?: Map<string, InsurerState> };
const store = () => (g.__safInsurerHealth ??= new Map());

function state(id: string): InsurerState {
  let s = store().get(id);
  if (!s) {
    s = { consecutiveFailures: 0, probing: false, calls: 0, errors: 0, timeouts: 0, rejections: 0, latencies: [] };
    store().set(id, s);
  }
  return s;
}

export function breakerState(id: string, now = Date.now()): BreakerState {
  const s = state(id);
  if (s.openedAt === undefined) return "cerrado";
  return now - s.openedAt >= BREAKER_OPEN_MS ? "semiabierto" : "abierto";
}

/**
 * ¿Se puede llamar a la aseguradora? Con el circuito semiabierto solo pasa una
 * llamada de prueba a la vez; si sale bien, el circuito se cierra.
 */
export function acquire(id: string, now = Date.now()): boolean {
  const st = breakerState(id, now);
  if (st === "cerrado") return true;
  if (st === "abierto") return false;
  const s = state(id);
  if (s.probing) return false;
  s.probing = true;
  return true;
}

/** Registra el resultado de una llamada. Los rechazos de negocio no abren el circuito. */
export function record(id: string, outcome: CallOutcome, latencyMs: number, error?: string, now = Date.now()) {
  const s = state(id);
  s.calls++;
  s.probing = false;
  if (outcome === "ok" || outcome === "rechazo") {
    if (outcome === "rechazo") s.rejections++;
    s.consecutiveFailures = 0;
    s.openedAt = undefined;
    s.lastSuccessAt = now;
    s.latencies.push(latencyMs);
    if (s.latencies.length > LATENCY_WINDOW) s.latencies.shift();
    return;
  }
  if (outcome === "timeout") s.timeouts++;
  else s.errors++;
  s.lastError = error;
  s.lastErrorAt = now;
  s.consecutiveFailures++;
  // Una prueba fallida en semiabierto vuelve a abrir el circuito por otro periodo.
  if (s.openedAt !== undefined || s.consecutiveFailures >= BREAKER_FAILURE_THRESHOLD) s.openedAt = now;
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

export interface InsurerHealth {
  insurerId: string;
  breaker: BreakerState;
  calls: number;
  errorRate: number;
  timeoutRate: number;
  rejectionRate: number;
  p50Ms?: number;
  p95Ms?: number;
  consecutiveFailures: number;
  lastError?: string;
  lastErrorAt?: string;
  lastSuccessAt?: string;
}

export function healthOf(id: string, now = Date.now()): InsurerHealth {
  const s = state(id);
  const rate = (n: number) => (s.calls ? n / s.calls : 0);
  const iso = (t?: number) => (t === undefined ? undefined : new Date(t).toISOString());
  return {
    insurerId: id,
    breaker: breakerState(id, now),
    calls: s.calls,
    errorRate: rate(s.errors),
    timeoutRate: rate(s.timeouts),
    rejectionRate: rate(s.rejections),
    p50Ms: percentile(s.latencies, 50),
    p95Ms: percentile(s.latencies, 95),
    consecutiveFailures: s.consecutiveFailures,
    lastError: s.lastError,
    lastErrorAt: iso(s.lastErrorAt),
    lastSuccessAt: iso(s.lastSuccessAt),
  };
}

/** Solo para pruebas. */
export function resetResilience() {
  store().clear();
}
