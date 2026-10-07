import { describe, expect, it } from "vitest";
import { applyDiscounts, discountTotal, type DiscountRule, type DiscountSettings } from "./discounts";
import type { Offer } from "./types";
import { priceBreakdown } from "./pricing";

const offer = (insurerId: string, annual = 1_000_000, vehicleType: Offer["vehicleType"] = "auto", plan = "auto-global"): Offer => ({
  id: `${insurerId}:${plan}`,
  insurerId,
  insurerName: insurerId,
  planName: plan,
  vehicleType,
  ...priceBreakdown(annual),
  rcLimit: 1,
  coverages: {} as Offer["coverages"],
  deductiblePct: 0,
  deductibleMinSmmlv: 0,
  services: [],
  substituteCarDays: 0,
  exclusions: [],
  conditionsUrl: "",
  validUntil: "2026-12-31",
});

const on: DiscountSettings = { enabled: true, maxTotalPct: 15 };
const rule = (r: Partial<DiscountRule>): DiscountRule => ({
  id: "r", insurerId: "sura", label: "Regla", source: "aseguradora", kind: "porcentaje", magnitude: 10, enabled: true, ...r,
});
const TODAY = "2026-10-07";

describe("descuentos", () => {
  it("aplica la regla de la aseguradora y recalcula IVA y cuota", () => {
    const o = applyDiscounts(offer("sura"), [rule({})], on, TODAY);
    expect(o.annualPremium).toBe(900_000);
    expect(o.listPremium).toBe(1_000_000);
    expect(o.netPremium + o.iva).toBe(900_000);
    expect(o.monthlyPremium).toBe(priceBreakdown(900_000).monthlyPremium);
    expect(o.discounts).toEqual([{ ruleId: "r", label: "Regla", source: "aseguradora", amount: 100_000 }]);
  });

  it("respeta el interruptor de la regla, el general y la aseguradora", () => {
    expect(applyDiscounts(offer("sura"), [rule({ enabled: false })], on, TODAY).discounts).toBeUndefined();
    expect(applyDiscounts(offer("sura"), [rule({})], { ...on, enabled: false }, TODAY).discounts).toBeUndefined();
    expect(applyDiscounts(offer("bolivar"), [rule({})], on, TODAY).discounts).toBeUndefined();
    expect(applyDiscounts(offer("bolivar"), [rule({ insurerId: "*" })], on, TODAY).discounts).toHaveLength(1);
  });

  it("filtra por tipo de vehículo, plan y vigencia", () => {
    const moto = rule({ vehicleTypes: ["moto"] });
    expect(applyDiscounts(offer("sura"), [moto], on, TODAY).discounts).toBeUndefined();
    expect(applyDiscounts(offer("sura", 500_000, "moto"), [moto], on, TODAY).discounts).toHaveLength(1);
    expect(applyDiscounts(offer("sura"), [rule({ planCodes: ["auto-rc"] })], on, TODAY).discounts).toBeUndefined();
    expect(applyDiscounts(offer("sura"), [rule({ validUntil: "2026-10-06" })], on, TODAY).discounts).toBeUndefined();
    expect(applyDiscounts(offer("sura"), [rule({ validFrom: "2026-10-07" })], on, TODAY).discounts).toHaveLength(1);
  });

  it("aplica el tope en pesos y los descuentos de valor fijo", () => {
    expect(discountTotal(applyDiscounts(offer("sura"), [rule({ maxAmount: 40_000 })], on, TODAY))).toBe(40_000);
    expect(discountTotal(applyDiscounts(offer("sura"), [rule({ kind: "valor", magnitude: 25_000 })], on, TODAY))).toBe(25_000);
  });

  it("toma la mejor regla por fuente, suma fuentes distintas y respeta el apetito global", () => {
    const rules = [
      rule({ id: "a", magnitude: 5 }),
      rule({ id: "b", magnitude: 8 }),
      rule({ id: "p", source: "plataforma", kind: "valor", magnitude: 100_000, insurerId: "*" }),
    ];
    const o = applyDiscounts(offer("sura"), rules, on, TODAY);
    // Aseguradora: 8% = 80.000 (no se acumula con el 5%). Plataforma recortada a 70.000 por el tope del 15%.
    expect(o.discounts).toEqual([
      expect.objectContaining({ ruleId: "b", amount: 80_000 }),
      expect.objectContaining({ ruleId: "p", amount: 70_000 }),
    ]);
    expect(o.annualPremium).toBe(850_000);
    expect(discountTotal(applyDiscounts(offer("sura"), rules, { enabled: true, maxTotalPct: 0 }, TODAY))).toBe(0);
  });

  it("es idempotente: aplicarlo dos veces parte del precio de lista", () => {
    const once = applyDiscounts(offer("sura"), [rule({})], on, TODAY);
    expect(applyDiscounts(once, [rule({})], on, TODAY).annualPremium).toBe(once.annualPremium);
  });
});

describe("redondeo", () => {
  it("lista menos descuentos es exactamente el precio final", () => {
    const o = applyDiscounts(offer("sura", 1_234_000), [rule({ magnitude: 7.3 })], on, TODAY);
    expect(o.discounts![0].amount % 1000).toBe(0);
    expect(o.listPremium! - discountTotal(o)).toBe(o.annualPremium);
  });
});
