import { describe, expect, it } from "vitest";
import type { Answers, QuoteRequest } from "@/domain/types";
import { priceOffers } from "@/insurers/mock/tariff";
import { BOLIVAR_CONFIG, SURA_CONFIG } from "@/insurers/mock/insurers";
import { insuredValueAdjust, lookupPlate, withInsuredValue } from "@/vehicles/lookup";
import { recommend } from "./scoring";

const answers: Answers = {
  priority: "equilibrio", use: "particular", parking: "cerrado", mileage: "medio", drivers: "solo",
  financed: false, deductibleTolerance: "medio", services: [], claimsLast3Years: 0,
};
const moto = (engineCc: number): QuoteRequest => ({
  vehicle: { type: "moto", plate: "XYZ12A", brand: "Yamaha", model: "MT-03", year: 2023, commercialValue: 20_000_000, engineCc },
  driver: { birthdate: "1995-03-03", city: "Bogotá" },
  answers,
});
const offersFor = (req: QuoteRequest) => [...priceOffers(req, SURA_CONFIG), ...priceOffers(req, BOLIVAR_CONFIG)];

describe("motos: cilindraje y hurto", () => {
  it("la placa de moto trae el cilindraje del catálogo", () => {
    for (const p of ["ABC12D", "XYZ98K", "MOT45A"]) expect(lookupPlate(p)?.engineCc).toBeGreaterThan(50);
    expect(lookupPlate("ABC123")?.engineCc).toBeUndefined();
  });

  it("a más cilindraje, prima más alta", () => {
    const price = (cc: number) => priceOffers(moto(cc), SURA_CONFIG).find((o) => o.id === "sura:moto-integral")!.annualPremium;
    expect(price(125)).toBeLessThan(price(200));
    expect(price(200)).toBeLessThan(price(321));
  });

  it("descarta los planes que no aseguran ese cilindraje y explica por qué", () => {
    const big = moto(321);
    const { excluded } = recommend(offersFor(big), answers, { vehicle: big.vehicle });
    expect(excluded.find((o) => o.id === "bolivar:moto-basico")?.reason).toMatch(/250 cc/);
    const small = moto(155);
    expect(recommend(offersFor(small), answers, { vehicle: small.vehicle }).excluded).toHaveLength(0);
  });

  it("en motos el hurto pesa y se explica", () => {
    const { offers } = recommend(offersFor(moto(155)), answers, { vehicle: { engineCc: 155 } });
    const rcOnly = offers.find((o) => o.id === "sura:moto-rc")!;
    expect(rcOnly.warnings.join()).toMatch(/hurto de la moto/);
    const withTheft = offers.find((o) => o.coverages.perdidaTotalHurto)!;
    expect(withTheft.reasons.join()).toMatch(/hurto, el riesgo más frecuente/);
  });
});

describe("valor asegurado ajustable", () => {
  it("ajusta dentro de ±20% y conserva el valor de referencia", () => {
    const v = { type: "auto" as const, brand: "Mazda", model: "Mazda 2", year: 2022, commercialValue: 70_000_000 };
    const low = withInsuredValue(v, -10);
    expect(low).toMatchObject({ commercialValue: 63_000_000, estimatedValue: 70_000_000 });
    expect(withInsuredValue(low, 35).commercialValue).toBe(84_000_000); // tope +20% sobre la referencia
    expect(insuredValueAdjust(low)).toBe(-10);
    expect(insuredValueAdjust(v)).toBe(0);
  });

  it("un valor asegurado menor baja la prima", () => {
    const req = moto(155);
    const lower = { ...req, vehicle: withInsuredValue(req.vehicle, -20) };
    const p = (r: QuoteRequest) => priceOffers(r, SURA_CONFIG).find((o) => o.id === "sura:moto-integral")!.annualPremium;
    expect(p(lower)).toBeLessThan(p(req));
  });
});
