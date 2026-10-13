import { describe, expect, it } from "vitest";
import { applyDiscounts, DEFAULT_DISCOUNT_RULES, DEFAULT_DISCOUNT_SETTINGS } from "./discounts";
import { generateReferralCode, normalizeReferralCode } from "./referrals";
import type { Offer } from "./types";

describe("códigos de invitación", () => {
  it("genera códigos válidos sin caracteres confusos", () => {
    for (let i = 0; i < 50; i++) expect(normalizeReferralCode(generateReferralCode())).not.toBeNull();
    expect(normalizeReferralCode("abc23k")).toBe("ABC23K");
    expect(normalizeReferralCode("ABC10K")).toBeNull();
    expect(normalizeReferralCode("<script>")).toBeNull();
  });
});

describe("descuento por invitación", () => {
  const offer = { id: "sura:auto-global", insurerId: "sura", vehicleType: "auto", annualPremium: 2_000_000 } as Offer;
  it("solo aplica con un código válido", () => {
    const without = applyDiscounts(offer, DEFAULT_DISCOUNT_RULES, DEFAULT_DISCOUNT_SETTINGS, "2026-10-13");
    const withRef = applyDiscounts(offer, DEFAULT_DISCOUNT_RULES, DEFAULT_DISCOUNT_SETTINGS, "2026-10-13", { referral: true });
    expect(without.discounts?.some((d) => d.ruleId === "plataforma-invitacion")).toBeFalsy();
    expect(withRef.discounts?.find((d) => d.ruleId === "plataforma-invitacion")?.amount).toBe(25_000);
    expect(withRef.annualPremium).toBe(without.annualPremium - 25_000);
  });
});
