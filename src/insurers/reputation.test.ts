import { describe, expect, it } from "vitest";
import { reputationFor, reputationScore } from "./reputation";

describe("reputationScore", () => {
  it("da 5 con los mejores indicadores y 1 con los peores", () => {
    expect(reputationScore({ complaintsPer10k: 1, claimPaymentDays: 3, claimsPaidPct: 99 })).toBe(5);
    expect(reputationScore({ complaintsPer10k: 25, claimPaymentDays: 40, claimsPaidPct: 60 })).toBe(1);
  });

  it("menos quejas y pagos más rápidos suben la calificación", () => {
    const base = { complaintsPer10k: 10, claimPaymentDays: 15, claimsPaidPct: 85 };
    expect(reputationScore({ ...base, complaintsPer10k: 5 })).toBeGreaterThan(reputationScore(base));
    expect(reputationScore({ ...base, claimPaymentDays: 8 })).toBeGreaterThan(reputationScore(base));
  });

  it("marca los datos como simulados y no inventa aseguradoras", () => {
    expect(reputationFor("sura")?.simulated).toBe(true);
    expect(reputationFor("desconocida")).toBeNull();
  });
});
