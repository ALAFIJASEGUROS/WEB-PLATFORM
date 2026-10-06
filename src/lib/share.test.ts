import { describe, expect, it } from "vitest";
import type { QuoteRequest } from "@/domain/types";
import { decodeShare, encodeShare } from "./share";

const req: QuoteRequest = {
  vehicle: { type: "auto", plate: "ABC123", brand: "Mazda", model: "Mazda 2", year: 2022, commercialValue: 70_000_000 },
  driver: { birthdate: "1990-05-10", city: "Medellín" },
  answers: { priority: "equilibrio", use: "particular", parking: "cerrado", mileage: "medio", drivers: "solo", financed: false, deductibleTolerance: "medio", services: ["grua"], claimsLast3Years: 0, weights: { price: 50, coverage: 30, services: 20 } },
};

describe("compartir cotización", () => {
  it("ida y vuelta sin placa y con la fecha reducida al año", () => {
    const back = decodeShare(encodeShare(req))!;
    expect(back.vehicle.plate).toBeUndefined();
    expect(back.vehicle.model).toBe("Mazda 2");
    expect(back.driver.birthdate).toBe("1990-07-01");
    expect(back.answers.weights).toEqual(req.answers.weights);
    expect(encodeShare(req)).not.toMatch(/[+/=]/);
  });

  it("rechaza enlaces alterados", () => {
    expect(decodeShare("no-es-valido")).toBeNull();
  });
});
