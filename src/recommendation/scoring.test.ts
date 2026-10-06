import { describe, expect, it } from "vitest";
import type { Answers, QuoteRequest } from "@/domain/types";
import { priceOffers } from "@/insurers/mock/tariff";
import { BOLIVAR_CONFIG, SURA_CONFIG } from "@/insurers/mock/insurers";
import { quoteAll } from "@/insurers/aggregator";
import { scoreOffers } from "./scoring";

const answers: Answers = {
  priority: "equilibrio",
  use: "particular",
  parking: "cerrado",
  mileage: "medio",
  drivers: "solo",
  financed: false,
  deductibleTolerance: "medio",
  services: [],
  claimsLast3Years: 0,
};

const req: QuoteRequest = {
  vehicle: { type: "auto", plate: "ABC123", brand: "Mazda", model: "Mazda 2", year: 2022, commercialValue: 70_000_000 },
  driver: { birthdate: "1990-05-10", city: "Medellín" },
  answers,
};

const offers = [...priceOffers(req, SURA_CONFIG), ...priceOffers(req, BOLIVAR_CONFIG)];

describe("scoreOffers", () => {
  it("con prioridad precio recomienda la opción más barata", () => {
    const [top] = scoreOffers(offers, { ...answers, priority: "precio" });
    const cheapest = Math.min(...offers.map((o) => o.annualPremium));
    expect(top.annualPremium).toBe(cheapest);
    expect(top.labels).toContain("menorPrecio");
  });

  it("con prioridad cobertura recomienda un plan todo riesgo", () => {
    const [top] = scoreOffers(offers, { ...answers, priority: "cobertura" });
    expect(top.coverages.perdidaParcialDanos).toBe(true);
    expect(top.coverages.perdidaTotalHurto).toBe(true);
  });

  it("penaliza planes que no cumplen requisitos de financiación", () => {
    const scored = scoreOffers(offers, { ...answers, priority: "precio", financed: true });
    const rcOnly = scored.find((o) => o.id === "sura:auto-rc")!;
    expect(rcOnly.warnings.join()).toMatch(/financiado/);
    expect(scored[0].coverages.perdidaTotalDanos).toBe(true);
  });

  it("asigna exactamente una etiqueta de recomendado y puntajes 0..100", () => {
    const scored = scoreOffers(offers, answers);
    expect(scored.filter((o) => o.labels.includes("recomendado"))).toHaveLength(1);
    for (const o of scored) {
      expect(o.score).toBeGreaterThanOrEqual(0);
      expect(o.score).toBeLessThanOrEqual(100);
    }
  });

  it("explica los servicios que el usuario pidió", () => {
    const [top] = scoreOffers(offers, { ...answers, priority: "servicios", services: ["autoSustituto", "asistenciaJuridica"] });
    expect(top.services).toEqual(expect.arrayContaining(["autoSustituto", "asistenciaJuridica"]));
    expect(top.reasons.join()).toMatch(/servicios que te importan/);
  });
});

describe("tarifas simuladas", () => {
  it("cobran más a conductores jóvenes y en domicilios", () => {
    const base = priceOffers(req, SURA_CONFIG)[1].annualPremium;
    const young = priceOffers({ ...req, driver: { ...req.driver, birthdate: "2005-01-01" } }, SURA_CONFIG)[1].annualPremium;
    const delivery = priceOffers({ ...req, answers: { ...answers, use: "domicilios" } }, SURA_CONFIG)[1].annualPremium;
    expect(young).toBeGreaterThan(base);
    expect(delivery).toBeGreaterThan(base);
  });

  it("ajustan por kilometraje y número de conductores", () => {
    const at = (a: Partial<Answers>) => priceOffers({ ...req, answers: { ...answers, ...a } }, SURA_CONFIG)[1].annualPremium;
    expect(at({ mileage: "bajo" })).toBeLessThan(at({ mileage: "medio" }));
    expect(at({ mileage: "alto" })).toBeGreaterThan(at({ mileage: "medio" }));
    expect(at({ drivers: "varios" })).toBeGreaterThan(at({ drivers: "solo" }));
  });

  it("solo devuelve planes del tipo de vehículo pedido", () => {
    const moto = priceOffers({ ...req, vehicle: { ...req.vehicle, type: "moto" } }, BOLIVAR_CONFIG);
    expect(moto.every((o) => o.vehicleType === "moto")).toBe(true);
  });
});

describe("quoteAll", () => {
  it("devuelve resultados parciales si una aseguradora falla", async () => {
    const { offers, errors } = await quoteAll({ ...req, vehicle: { ...req.vehicle, plate: "ERR123" } });
    expect(errors.map((e) => e.insurerId)).toEqual(["sura"]);
    expect(offers.every((o) => o.insurerId === "bolivar")).toBe(true);
  });

  it("reporta timeout sin bloquear", async () => {
    const { errors } = await quoteAll(req, undefined, 10);
    expect(errors).toHaveLength(2);
    expect(errors[0].message).toMatch(/tardó/);
  });
});
