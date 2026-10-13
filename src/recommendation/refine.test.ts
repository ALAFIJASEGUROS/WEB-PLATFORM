import { describe, expect, it } from "vitest";
import type { Answers, QuoteRequest } from "@/domain/types";
import { priceOffers } from "@/insurers/mock/tariff";
import { BOLIVAR_CONFIG, SURA_CONFIG } from "@/insurers/mock/insurers";
import { buildQuoteResponse } from "./scoring";
import { rescore } from "./refine";

const answers: Answers = {
  priority: "cobertura",
  use: "particular",
  parking: "cerrado",
  mileage: "medio",
  drivers: "solo",
  financed: false,
  deductibleTolerance: "bajo",
  services: [],
  claimsLast3Years: 0,
};
const req: QuoteRequest = {
  vehicle: { type: "auto", plate: "ABC123", brand: "Mazda", model: "Mazda 2", year: 2022, commercialValue: 70_000_000 },
  driver: { birthdate: "1990-05-10", city: "Medellín" },
  answers,
};
const offers = [...priceOffers(req, SURA_CONFIG), ...priceOffers(req, BOLIVAR_CONFIG)];
const res = { ...buildQuoteResponse(offers, [], answers), experiment: { id: "x", variant: "b" } };

describe("rescore", () => {
  it("reordena las mismas opciones con los nuevos pesos, sin volver a cotizar", () => {
    const next = rescore(req, res, { ...answers, weights: { price: 100, coverage: 0, services: 0 }, deductibleTolerance: "alto" });
    const cheapest = Math.min(...offers.map((o) => o.annualPremium));
    expect(next.response.offers[0].annualPremium).toBe(cheapest);
    expect(next.response.offers.map((o) => o.id).sort()).toEqual(res.offers.map((o) => o.id).sort());
    expect(next.response.quoteId).toBe(res.quoteId);
    expect(next.request.answers.weights).toEqual({ price: 100, coverage: 0, services: 0 });
  });

  it("recalcula las etiquetas y deja de reportar el experimento A/B", () => {
    const next = rescore(req, res, { ...answers, weights: { price: 100, coverage: 0, services: 0 } });
    expect(next.response.experiment).toBeUndefined();
    expect(next.response.offers.filter((o) => o.labels.includes("recomendado"))).toHaveLength(1);
    expect(next.response.offers[0].labels).toContain("recomendado");
  });
});
