import { describe, expect, it } from "vitest";
import type { QuoteRequest } from "@/domain/types";
import { BOLIVAR_CONFIG } from "@/insurers/mock/insurers";
import { priceOffers } from "@/insurers/mock/tariff";
import { compareStep, planSteps } from "./upgrade";

const req: QuoteRequest = {
  vehicle: { type: "auto", plate: "ABC123", brand: "Mazda", model: "Mazda 2", year: 2022, commercialValue: 70_000_000 },
  driver: { birthdate: "1990-05-10", city: "Medellín" },
  answers: { priority: "equilibrio", use: "particular", parking: "cerrado", mileage: "medio", drivers: "solo", financed: false, deductibleTolerance: "medio", services: [], claimsLast3Years: 0 },
};
const offers = priceOffers(req, BOLIVAR_CONFIG);
const esencial = offers.find((o) => o.id === "bolivar:auto-esencial")!;
const plus = offers.find((o) => o.id === "bolivar:auto-plus")!;

describe("qué ganas con el plan superior", () => {
  it("lista coberturas, deducible, RC y asistencias que se suman, con el costo extra", () => {
    const step = compareStep(esencial, plus);
    expect(step.extraAnnual).toBe(plus.annualPremium - esencial.annualPremium);
    expect(step.extraAnnual).toBeGreaterThan(0);
    expect(step.gains).toEqual(
      expect.arrayContaining([
        "Pérdida parcial por daños",
        "Eventos de la naturaleza",
        "Responsabilidad civil de $1.500 M a $3.000 M",
        "Deducible de 20 % (mín. 2 SMMLV) a 10 % (mín. 1 SMMLV)",
        "Vehículo de reemplazo (10 días)",
      ]),
    );
    expect(step.losses).toEqual([]);
  });

  it("ordena por precio y arma un escalón por par de planes consecutivos", () => {
    const steps = planSteps([plus, esencial]);
    expect(steps).toHaveLength(1);
    expect(steps[0].from.id).toBe(esencial.id);
    expect(steps[0].to.id).toBe(plus.id);
  });

  it("no aplica con un solo plan", () => {
    expect(planSteps([plus])).toEqual([]);
  });
});
