import { beforeEach, describe, expect, it } from "vitest";
import type { QuoteRequest } from "@/domain/types";
import { quoteWithCache, tariffKey } from "./cache";

const req: QuoteRequest = {
  vehicle: { type: "moto", plate: "ABC12D", brand: "Yamaha", model: "NMAX 155", year: 2023, commercialValue: 13_000_000 },
  driver: { birthdate: "1995-03-03", city: "Cali" },
  answers: { priority: "precio", use: "particular", parking: "cerrado", mileage: "medio", drivers: "solo", financed: false, deductibleTolerance: "medio", services: [], claimsLast3Years: 0 },
};

beforeEach(() => {
  (globalThis as { __safQuoteCache?: unknown }).__safQuoteCache = undefined;
});

describe("caché de cotizaciones", () => {
  it("las preferencias no cambian la clave; los datos de tarifa sí", () => {
    const prefs = { ...req, answers: { ...req.answers, priority: "cobertura" as const, services: ["grua" as const] } };
    expect(tariffKey(prefs)).toBe(tariffKey(req));
    expect(tariffKey({ ...req, driver: { ...req.driver, city: "Bogotá" } })).not.toBe(tariffKey(req));
  });

  it("devuelve la cotización guardada y expira a los 15 minutos", async () => {
    const t0 = Date.now();
    expect((await quoteWithCache(req, t0)).cached).toBe(false);
    expect((await quoteWithCache(req, t0 + 60_000)).cached).toBe(true);
    expect((await quoteWithCache(req, t0 + 16 * 60_000)).cached).toBe(false);
  });

  it("no guarda resultados parciales", async () => {
    const failing = { ...req, vehicle: { ...req.vehicle, plate: "ERR12D" } };
    const first = await quoteWithCache(failing);
    expect(first.errors.length).toBe(1);
    expect((await quoteWithCache(failing)).cached).toBe(false);
  });
});
