import { describe, expect, it } from "vitest";
import type { QuoteRequest } from "./types";
import { applyDiscounts, DEFAULT_DISCOUNT_SETTINGS } from "./discounts";
import {
  companyDiscountRule,
  companyInputSchema,
  DEFAULT_TIERS,
  estimatedSavings,
  nextTier,
  normalizeTiers,
  parseDomains,
  slugify,
  tierFor,
  type Company,
} from "./companies";
import { BOLIVAR_CONFIG } from "@/insurers/mock/insurers";
import { priceOffers } from "@/insurers/mock/tariff";

const company: Company = {
  id: "c1",
  name: "Andina Logística",
  slug: "andina-logistica",
  emailDomains: ["andina.com.co"],
  joinCode: "ANDINA25",
  paymentModel: "empleado",
  allowedPlanCodes: [],
  tiers: DEFAULT_TIERS,
  status: "activa",
  createdAt: "2026-11-15T00:00:00Z",
};

const req: QuoteRequest = {
  vehicle: { type: "auto", plate: "ABC123", brand: "Mazda", model: "Mazda 2", year: 2022, commercialValue: 70_000_000 },
  driver: { birthdate: "1990-05-10", city: "Medellín" },
  answers: { priority: "equilibrio", use: "particular", parking: "cerrado", mileage: "medio", drivers: "solo", financed: false, deductibleTolerance: "medio", services: [], claimsLast3Years: 0 },
};

describe("tramos por volumen", () => {
  it("aplica el tramo alcanzado en los bordes", () => {
    expect(tierFor(9, DEFAULT_TIERS)).toBeNull();
    expect(tierFor(10, DEFAULT_TIERS)?.discountPct).toBe(5);
    expect(tierFor(24, DEFAULT_TIERS)?.discountPct).toBe(5);
    expect(tierFor(25, DEFAULT_TIERS)?.discountPct).toBe(8);
    expect(tierFor(500, DEFAULT_TIERS)?.discountPct).toBe(14);
  });

  it("dice cuántos faltan para el siguiente tramo", () => {
    expect(nextTier(20, DEFAULT_TIERS)).toEqual({ tier: { minEmployees: 25, discountPct: 8 }, missing: 5 });
    expect(nextTier(100, DEFAULT_TIERS)).toBeNull();
  });

  it("ordena y limpia tramos desordenados o inválidos", () => {
    expect(normalizeTiers([{ minEmployees: 50, discountPct: 10 }, { minEmployees: 0, discountPct: 3 }, { minEmployees: 10, discountPct: 4 }])).toEqual([
      { minEmployees: 10, discountPct: 4 },
      { minEmployees: 50, discountPct: 10 },
    ]);
  });

  it("estima el ahorro anual de la empresa", () => {
    expect(estimatedSavings(30, 1_500_000, DEFAULT_TIERS)).toBe(3_600_000);
    expect(estimatedSavings(5, 1_500_000, DEFAULT_TIERS)).toBe(0);
  });
});

describe("tarifa corporativa", () => {
  const [offer] = priceOffers(req, BOLIVAR_CONFIG);

  it("descuenta el porcentaje del tramo actual", () => {
    const rule = companyDiscountRule(company, 30)!;
    expect(rule).toMatchObject({ label: "Tarifa corporativa Andina Logística", magnitude: 8, source: "aseguradora" });
    const discounted = applyDiscounts(offer, [rule], DEFAULT_DISCOUNT_SETTINGS);
    expect(discounted.listPremium).toBe(offer.annualPremium);
    // El motor redondea a miles.
    expect(Math.abs(discounted.discounts![0].amount - offer.annualPremium * 0.08)).toBeLessThanOrEqual(1000);
  });

  it("no aplica sin el mínimo de inscritos ni si la empresa está pausada", () => {
    expect(companyDiscountRule(company, 3)).toBeNull();
    expect(companyDiscountRule({ ...company, status: "pausada" }, 30)).toBeNull();
  });

  it("solo descuenta los planes habilitados por la empresa", () => {
    const rule = companyDiscountRule({ ...company, allowedPlanCodes: ["auto-plus"] }, 30)!;
    const offers = priceOffers(req, BOLIVAR_CONFIG).map((o) => applyDiscounts(o, [rule], DEFAULT_DISCOUNT_SETTINGS));
    expect(offers.find((o) => o.id === "bolivar:auto-plus")?.discounts).toHaveLength(1);
    expect(offers.find((o) => o.id === "bolivar:auto-esencial")?.discounts).toBeUndefined();
  });

  it("respeta el tope global de descuentos", () => {
    const rule = companyDiscountRule({ ...company, tiers: [{ minEmployees: 1, discountPct: 40 }] }, 10)!;
    const d = applyDiscounts(offer, [rule], { enabled: true, maxTotalPct: 15 });
    expect(d.annualPremium).toBeGreaterThanOrEqual(Math.round(offer.annualPremium * 0.85) - 1000);
  });
});

describe("formulario de empresa", () => {
  const base = { name: "Andina Logística", paymentModel: "empleado", tiers: DEFAULT_TIERS, domains: "" } as const;

  it("normaliza dominios y nombres de URL", () => {
    expect(parseDomains("@Andina.com.co, otra.co  andina.com.co")).toEqual(["andina.com.co", "otra.co"]);
    expect(slugify("Ándina Logística S.A.S.")).toBe("andina-logistica-s-a-s");
  });

  it("rechaza correos públicos como dominio de empresa", () => {
    const r = companyInputSchema.safeParse({ ...base, domains: "gmail.com" });
    expect(r.success).toBe(false);
  });

  it("exige el aporte en copago", () => {
    expect(companyInputSchema.safeParse({ ...base, paymentModel: "copago" }).success).toBe(false);
    expect(companyInputSchema.safeParse({ ...base, paymentModel: "copago", copayAmount: "500000" }).success).toBe(true);
  });
});
