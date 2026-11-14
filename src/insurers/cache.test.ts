import { beforeEach, describe, expect, it } from "vitest";
import type { QuoteRequest } from "@/domain/types";
import { quoteWithCache, tariffKey } from "./cache";
import { BOLIVAR_CONFIG, SURA_CONFIG } from "./mock/insurers";
import { createMockAdapter } from "./mock/tariff";

const TWO = [createMockAdapter(SURA_CONFIG), createMockAdapter({ ...BOLIVAR_CONFIG, failPlatePrefix: undefined })];

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

  it("solo cotiza con Bolívar, la aseguradora activa", async () => {
    const { offers } = await quoteWithCache(req);
    expect(new Set(offers.map((o) => o.insurerId))).toEqual(new Set(["bolivar"]));
  });

  it("guarda lo que respondió y vuelve a consultar solo la aseguradora que falló", async () => {
    const failing = { ...req, vehicle: { ...req.vehicle, plate: "ERR12D" } };
    const first = await quoteWithCache(failing, Date.now(), TWO);
    expect(first.errors.map((e) => e.insurerId)).toEqual(["sura"]);
    const cache = (globalThis as { __safQuoteCache?: Map<string, unknown> }).__safQuoteCache!;
    const key = tariffKey(failing);
    expect(cache.has(`bolivar|${key}`)).toBe(true);
    expect(cache.has(`sura|${key}`)).toBe(false);
    const second = await quoteWithCache(failing, Date.now(), TWO);
    expect(second.cached).toBe(false);
    expect(second.offers.some((o) => o.insurerId === "bolivar")).toBe(true);
  });
});
