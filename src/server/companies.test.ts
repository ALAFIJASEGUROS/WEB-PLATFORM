import { beforeEach, describe, expect, it } from "vitest";
import { companyInputSchema, DEFAULT_TIERS } from "@/domain/companies";
import { leadInputSchema, leadSummary } from "@/domain/leads";
import { createLead } from "./leads";
import type { QuoteRequest } from "@/domain/types";
import { BOLIVAR_CONFIG } from "@/insurers/mock/insurers";
import { priceOffers } from "@/insurers/mock/tariff";
import {
  CompanyError,
  companiesForEmail,
  enrolledCount,
  findCompanyByJoinCode,
  findCompanyBySlug,
  logoToDataUrl,
  pendingCount,
  rotateJoinCode,
  saveCompany,
  withCompanyPricing,
} from "./companies";

beforeEach(() => {
  (globalThis as { __safDb?: unknown }).__safDb = undefined;
  (globalThis as { __safDiscounts?: unknown }).__safDiscounts = undefined;
});

const input = (over: Record<string, unknown> = {}) =>
  companyInputSchema.parse({ name: "Transportes del Valle", paymentModel: "empleado", tiers: DEFAULT_TIERS, domains: "tdv.com.co", ...over });

const req: QuoteRequest = {
  vehicle: { type: "auto", plate: "ABC123", brand: "Mazda", model: "Mazda 2", year: 2022, commercialValue: 70_000_000 },
  driver: { birthdate: "1990-05-10", city: "Medellín" },
  answers: { priority: "equilibrio", use: "particular", parking: "cerrado", mileage: "medio", drivers: "solo", financed: false, deductibleTolerance: "medio", services: [], claimsLast3Years: 0 },
};

describe("empresas del beneficio para empleados", () => {
  it("crea la empresa con nombre de URL, código y dominios", () => {
    const c = saveCompany(input());
    expect(c.slug).toBe("transportes-del-valle");
    expect(c.joinCode).toMatch(/^TRANSP[A-Z2-9]{4}$/);
    expect(findCompanyBySlug("transportes-del-valle")?.id).toBe(c.id);
    expect(findCompanyByJoinCode(c.joinCode.toLowerCase())?.id).toBe(c.id);
    expect(companiesForEmail("ana@TDV.com.co").map((x) => x.id)).toEqual([c.id]);
  });

  it("evita nombres de URL repetidos y dominios de otra empresa", () => {
    saveCompany(input());
    expect(saveCompany(input({ domains: "otro.co" })).slug).toBe("transportes-del-valle-2");
    expect(() => saveCompany(input({ name: "Otra", domains: "tdv.com.co" }))).toThrow(CompanyError);
  });

  it("al editar conserva el código y permite cambiarlo", () => {
    const c = saveCompany(input());
    const edited = saveCompany(input({ id: c.id, name: "TDV" }));
    expect(edited.joinCode).toBe(c.joinCode);
    expect(rotateJoinCode(c.id)).not.toBe(c.joinCode);
  });

  it("valida el logo", async () => {
    const png = new File([new Uint8Array([137, 80, 78, 71])], "logo.png", { type: "image/png" });
    expect(await logoToDataUrl(png)).toMatch(/^data:image\/png;base64,/);
    await expect(logoToDataUrl(new File(["x"], "a.gif", { type: "image/gif" }))).rejects.toThrow(/PNG/);
    await expect(logoToDataUrl(new File([new Uint8Array(201 * 1024)], "big.png", { type: "image/png" }))).rejects.toThrow(/200 KB/);
  });

  it("la empresa de demostración tiene inscritos y precio de su tramo", () => {
    expect(enrolledCount("demo-andina")).toBe(18);
    expect(pendingCount("demo-andina")).toBe(4);
    const offers = withCompanyPricing(priceOffers(req, BOLIVAR_CONFIG), "demo-andina");
    const plus = offers.find((o) => o.id === "bolivar:auto-plus")!;
    expect(plus.discounts?.map((d) => d.label)).toContain("Tarifa corporativa Andina Logística (demo)");
  });
});

describe("solicitud del beneficio desde /empresas", () => {
  const base = { kind: "empresa", name: "Laura Pérez", phone: "3001234567", email: "laura@tdv.com.co", slot: "manana", contactConsent: true } as const;

  it("llega a la bandeja de oportunidades con el resumen de la empresa", () => {
    const lead = createLead(leadInputSchema.parse({ ...base, benefit: { company: "Transportes del Valle", employees: 120, role: "Bienestar" } }));
    expect(lead.consent.source).toBe("empresas");
    expect(leadSummary(lead)).toBe("Transportes del Valle · 120 empleados · Bienestar");
  });

  it("exige los datos de la empresa", () => {
    expect(leadInputSchema.safeParse(base).success).toBe(false);
    expect(leadInputSchema.safeParse({ ...base, benefit: { company: "TDV", employees: 0 } }).success).toBe(false);
  });
});
