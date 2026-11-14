import { beforeEach, describe, expect, it } from "vitest";
import type { Offer, QuoteRequest } from "@/domain/types";
import { InsurerUnavailableError, type InsurerAdapter } from "./adapter";
import { quoteAll } from "./aggregator";
import { MOCK_INSURERS } from "./mock/insurers";
import {
  acquire,
  BREAKER_FAILURE_THRESHOLD,
  BREAKER_OPEN_MS,
  breakerState,
  healthOf,
  record,
  resetResilience,
} from "./resilience";

const req: QuoteRequest = {
  vehicle: { type: "auto", plate: "ABC123", brand: "Mazda", model: "Mazda 2", year: 2022, commercialValue: 70_000_000 },
  driver: { birthdate: "1990-05-10", city: "Medellín" },
  answers: { priority: "precio", use: "particular", parking: "cerrado", mileage: "medio", drivers: "solo", financed: false, deductibleTolerance: "medio", services: [], claimsLast3Years: 0 },
};

/** Adaptador que responde según una secuencia de comportamientos. */
function scripted(id: string, script: ("ok" | "falla" | "lento")[]): InsurerAdapter & { calls: number } {
  const base = MOCK_INSURERS[0];
  const adapter = {
    ...base,
    id,
    name: id,
    calls: 0,
    async quote(_r: QuoteRequest, signal: AbortSignal): Promise<Offer[]> {
      const step = script[Math.min(adapter.calls, script.length - 1)];
      adapter.calls++;
      if (step === "falla") throw new InsurerUnavailableError(`${id} falló`);
      if (step === "lento") {
        await new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason)));
      }
      return [{ id: `${id}:p`, insurerId: id } as Offer];
    },
  };
  return adapter;
}

beforeEach(() => resetResilience());

describe("circuit breaker", () => {
  it("abre tras fallas seguidas, deja pasar una prueba y se cierra si sale bien", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < BREAKER_FAILURE_THRESHOLD; i++) record("x", "error", 10, "boom", t0);
    expect(breakerState("x", t0)).toBe("abierto");
    expect(acquire("x", t0 + 1000)).toBe(false);

    const later = t0 + BREAKER_OPEN_MS;
    expect(acquire("x", later)).toBe(true);
    expect(acquire("x", later)).toBe(false); // una sola prueba a la vez
    record("x", "ok", 50, undefined, later);
    expect(breakerState("x", later)).toBe("cerrado");
  });

  it("una prueba fallida vuelve a abrir el circuito", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < BREAKER_FAILURE_THRESHOLD; i++) record("x", "timeout", 10, "lento", t0);
    const later = t0 + BREAKER_OPEN_MS;
    acquire("x", later);
    record("x", "error", 10, "boom", later);
    expect(breakerState("x", later + 1)).toBe("abierto");
  });

  it("los rechazos de negocio no abren el circuito", () => {
    for (let i = 0; i < BREAKER_FAILURE_THRESHOLD * 2; i++) record("x", "rechazo", 10);
    expect(breakerState("x")).toBe("cerrado");
    expect(healthOf("x").rejectionRate).toBe(1);
  });

  it("calcula tasas y percentiles", () => {
    for (let i = 1; i <= 100; i++) record("x", "ok", i);
    record("x", "error", 0, "boom");
    const h = healthOf("x");
    expect(h.p50Ms).toBe(50);
    expect(h.p95Ms).toBe(95);
    expect(h.errorRate).toBeCloseTo(1 / 101);
    expect(h.lastError).toBe("boom");
  });
});

describe("quoteAll resiliente", () => {
  it("reintenta una vez ante un error técnico", async () => {
    const a = scripted("a", ["falla", "ok"]);
    const { offers, errors } = await quoteAll(req, [a]);
    expect(errors).toEqual([]);
    expect(offers).toHaveLength(1);
    expect(a.calls).toBe(2);
  });

  it("no reintenta un timeout y lo clasifica", async () => {
    const a = scripted("a", ["lento"]);
    const { errors } = await quoteAll(req, [a], { timeoutMs: 20 });
    expect(errors[0]).toMatchObject({ insurerId: "a", kind: "timeout" });
    expect(a.calls).toBe(1);
  });

  it("no reintenta si no queda presupuesto", async () => {
    const a = scripted("a", ["falla", "ok"]);
    const { errors } = await quoteAll(req, [a], { budgetMs: 500 });
    expect(errors[0].kind).toBe("error");
    expect(a.calls).toBe(1);
  });

  it("con el circuito abierto no llama a la aseguradora y sigue con las demás", async () => {
    for (let i = 0; i < BREAKER_FAILURE_THRESHOLD; i++) record("a", "error", 10, "boom");
    const a = scripted("a", ["ok"]);
    const b = scripted("b", ["ok"]);
    const { offers, errors } = await quoteAll(req, [a, b]);
    expect(a.calls).toBe(0);
    expect(errors).toEqual([expect.objectContaining({ insurerId: "a", kind: "no_disponible" })]);
    expect(offers.map((o) => o.insurerId)).toEqual(["b"]);
  });
});
