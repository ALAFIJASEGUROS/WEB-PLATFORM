import { describe, expect, it } from "vitest";
import type { Answers, QuoteRequest } from "@/domain/types";
import { priceOffers } from "@/insurers/mock/tariff";
import { BOLIVAR_CONFIG, SURA_CONFIG } from "@/insurers/mock/insurers";
import { quoteAll } from "@/insurers/aggregator";
import { recommend, scoreOffers, TIE_THRESHOLD } from "./scoring";

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

  it("descarta planes que no cumplen los requisitos de financiación y explica por qué", () => {
    const { offers: scored, excluded } = recommend(offers, { ...answers, priority: "precio", financed: true });
    expect(scored.find((o) => o.id === "sura:auto-rc")).toBeUndefined();
    expect(excluded.find((o) => o.id === "sura:auto-rc")?.reason).toMatch(/financiado/);
    expect(scored.every((o) => o.coverages.perdidaTotalDanos && o.coverages.perdidaTotalHurto)).toBe(true);
  });

  it("descarta planes que no aceptan el uso declarado", () => {
    const motoReq: QuoteRequest = { ...req, vehicle: { ...req.vehicle, type: "moto", commercialValue: 9_000_000 } };
    const motoOffers = [...priceOffers(motoReq, SURA_CONFIG), ...priceOffers(motoReq, BOLIVAR_CONFIG)];
    const { offers: scored, excluded } = recommend(motoOffers, { ...answers, use: "domicilios" });
    expect(excluded.map((o) => o.id).sort()).toEqual(["bolivar:moto-basico", "sura:moto-integral"]);
    expect(excluded[0].reason).toMatch(/domicilios/);
    expect(scored.length).toBeGreaterThan(0);
    expect(recommend(motoOffers, answers).excluded).toHaveLength(0);
  });

  it("en empate técnico recomienda la más barata y marca ambas", () => {
    const base = offers.find((o) => o.id === "sura:auto-global")!;
    const twin = { ...base, id: "bolivar:twin", insurerId: "bolivar", annualPremium: base.annualPremium - 1000 };
    const scored = scoreOffers([base, twin], answers);
    expect(Math.abs(scored[0].score - scored[1].score)).toBeLessThan(TIE_THRESHOLD);
    expect(scored[0].id).toBe("bolivar:twin");
    expect(scored[0].labels).toEqual(expect.arrayContaining(["recomendado", "empate"]));
    expect(scored[1].labels).toContain("empate");
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

describe("pesos personalizados", () => {
  it("rebalance mantiene la suma en 100", async () => {
    const { rebalance } = await import("./scoring");
    const w = rebalance({ price: 40, coverage: 40, services: 20 }, "price", 70);
    expect(w.price).toBe(70);
    expect(w.price + w.coverage + w.services).toBe(100);
    expect(w.coverage).toBeGreaterThan(w.services);
  });

  it("100% precio recomienda la opción más barata aunque la prioridad diga cobertura", () => {
    const [top] = scoreOffers(offers, { ...answers, priority: "cobertura", weights: { price: 100, coverage: 0, services: 0 } });
    expect(top.annualPremium).toBe(Math.min(...offers.map((o) => o.annualPremium)));
  });
});

describe("ficha de la oferta", () => {
  it("desglosa la prima con IVA del 19% y trae exclusiones y condicionado", () => {
    for (const o of offers) {
      expect(o.netPremium + o.iva).toBe(o.annualPremium);
      expect(Math.abs(o.iva - o.netPremium * 0.19)).toBeLessThanOrEqual(1);
      expect(o.exclusions.length).toBeGreaterThan(3);
      expect(o.conditionsUrl).toMatch(/^\/condicionado\//);
    }
  });
});
