import { describe, expect, it } from "vitest";
import { leadInputSchema, normalizeMobile } from "./leads";

describe("normalizeMobile", () => {
  it("acepta celulares colombianos con o sin indicativo", () => {
    expect(normalizeMobile("300 123 4567")).toBe("3001234567");
    expect(normalizeMobile("+57 310-555-0000")).toBe("3105550000");
  });
  it("rechaza fijos y números incompletos", () => {
    expect(normalizeMobile("6011234567")).toBeNull();
    expect(normalizeMobile("30012345")).toBeNull();
  });
});

describe("leadInputSchema", () => {
  const base = { kind: "llamada", name: "Ana Gómez", phone: "3001234567", slot: "tarde", contactConsent: true };
  it("exige la autorización de contacto", () => {
    expect(leadInputSchema.safeParse({ ...base, contactConsent: false }).success).toBe(false);
    expect(leadInputSchema.safeParse(base).success).toBe(true);
  });
  it("solo permite franjas dentro de la Ley 2300", () => {
    expect(leadInputSchema.safeParse({ ...base, slot: "noche" }).success).toBe(false);
  });
});
