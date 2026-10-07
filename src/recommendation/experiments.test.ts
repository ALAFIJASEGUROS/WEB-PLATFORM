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

describe("experimentos de interfaz", () => {
  it("el script de arranque asigna lo mismo que assignVariantOf", async () => {
    const { runInNewContext } = await import("node:vm");
    const { experimentBootScript, assignVariantOf, UI_EXPERIMENTS } = await import("./experiments");
    for (const sid of ["a", "sesion-123", "f3b1c2d4-0000-4000-8000-000000000000"]) {
      const attrs: Record<string, string> = {};
      runInNewContext(experimentBootScript(UI_EXPERIMENTS), {
        sessionStorage: { getItem: () => sid, setItem: () => {} },
        document: { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } },
        self: {},
        Math,
        String,
        Date,
      });
      for (const e of UI_EXPERIMENTS.filter((x) => x.active)) {
        expect(attrs[`data-x-${e.id}`]).toBe(assignVariantOf(e, sid).id);
      }
    }
  });

  it("el CSS oculta las variantes que no tocan y deja el control sin asignación", async () => {
    const { experimentCss } = await import("./experiments");
    const css = experimentCss([{ id: "x", question: "", active: true, variants: [{ id: "a", label: "", split: 50 }, { id: "b", label: "", split: 50 }] }]);
    expect(css).toContain(`html:not([data-x-x]) [data-xv^="x:"]:not([data-xv="x:a"]){display:none!important}`);
    expect(css).toContain(`html[data-x-x="b"] [data-xv^="x:"]:not([data-xv="x:b"]){display:none!important}`);
  });
});
