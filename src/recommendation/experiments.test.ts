import { describe, expect, it } from "vitest";
import type { Answers, QuoteRequest } from "@/domain/types";
import { priceOffers } from "@/insurers/mock/tariff";
import { BOLIVAR_CONFIG, SURA_CONFIG } from "@/insurers/mock/insurers";
import { assignmentFor, assignVariant, WEIGHT_EXPERIMENTS } from "./experiments";
import { buildQuoteResponse, effectiveWeights, PRIORITY_WEIGHTS } from "./scoring";

const exp = WEIGHT_EXPERIMENTS[0];
const answers: Answers = {
  priority: "equilibrio", use: "particular", parking: "cerrado", mileage: "medio", drivers: "solo",
  financed: false, deductibleTolerance: "medio", services: [], claimsLast3Years: 0,
};

describe("experimentos A/B", () => {
  it("asigna siempre la misma variante a la misma sesión y reparte cerca del 50/50", () => {
    expect(assignVariant(exp, "sesion-1").id).toBe(assignVariant(exp, "sesion-1").id);
    const counts = new Map<string, number>();
    for (let i = 0; i < 4000; i++) {
      const v = assignVariant(exp, `s-${i}`).id;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    for (const v of exp.variants) expect(counts.get(v.id)! / 4000).toBeGreaterThan(0.45);
  });

  it("sin sesión o sin experimento activo no asigna", () => {
    expect(assignmentFor(undefined, WEIGHT_EXPERIMENTS)).toBeNull();
    expect(assignmentFor("x", WEIGHT_EXPERIMENTS.map((e) => ({ ...e, active: false })))).toBeNull();
  });

  it("solo cambia los pesos de la prioridad del experimento", () => {
    const variant = exp.variants.find((v) => v.priorityWeights)!;
    const opts = { priorityWeights: variant.priorityWeights };
    expect(effectiveWeights(answers, opts)).toEqual(variant.priorityWeights!.equilibrio);
    expect(effectiveWeights({ ...answers, priority: "precio" }, opts)).toEqual(PRIORITY_WEIGHTS.precio);
  });

  it("no aplica a quien ajustó sus pesos y marca la variante en la respuesta", () => {
    const req: QuoteRequest = {
      vehicle: { type: "auto", plate: "ABC123", brand: "Mazda", model: "Mazda 2", year: 2022, commercialValue: 70_000_000 },
      driver: { birthdate: "1990-05-10", city: "Medellín" },
      answers,
    };
    const offers = [...priceOffers(req, SURA_CONFIG), ...priceOffers(req, BOLIVAR_CONFIG)];
    const variant = exp.variants[1];
    const assignment = { experimentId: exp.id, variantId: variant.id, priorityWeights: variant.priorityWeights };
    expect(buildQuoteResponse(offers, [], answers, assignment).experiment).toEqual({ id: exp.id, variant: variant.id });
    const custom = { ...answers, weights: { price: 34, coverage: 33, services: 33 } };
    expect(buildQuoteResponse(offers, [], custom, assignment).experiment).toBeUndefined();
    // Las ofertas elegibles no cambian con la variante: solo su orden.
    const ids = (r: ReturnType<typeof buildQuoteResponse>) => r.offers.map((o) => o.id).sort();
    expect(ids(buildQuoteResponse(offers, [], answers, assignment))).toEqual(ids(buildQuoteResponse(offers, [], answers)));
  });
});
