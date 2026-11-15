import { beforeEach, describe, expect, it } from "vitest";
import { companyInputSchema, companyProgramSchema, DEFAULT_TIERS } from "@/domain/companies";

const companyInputSchemaProgram = (x: unknown) => companyProgramSchema.parse(x);
import { leadInputSchema, leadSummary } from "@/domain/leads";
import { createLead } from "./leads";
import type { QuoteRequest } from "@/domain/types";
import { BOLIVAR_CONFIG } from "@/insurers/mock/insurers";
import { priceOffers } from "@/insurers/mock/tariff";
import { db, getOrCreateUser } from "./db";
import {
  choosePlan,
  companyAuditFor,
  companyRole,
  CompanyError,
  decideMemberships,
  inviteEmployees,
  membersOf,
  updateProgram,
  joinCompany,
  membershipFor,
  membershipsForUser,
  quoteAsEmployee,
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
    expect(pendingCount("demo-andina")).toBe(2);
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

describe("portal del empleado", () => {
  const andina = () => findCompanyBySlug("andina-logistica")!;

  it("vincula por dominio de correo y queda pendiente", () => {
    const user = getOrCreateUser("ana@andina-demo.co");
    const m = joinCompany(andina(), user);
    expect(m).toMatchObject({ source: "dominio", status: "pendiente", userId: user.id });
    expect(joinCompany(andina(), user).id).toBe(m.id); // no duplica
  });

  it("con otro correo exige el código de la empresa", () => {
    const user = getOrCreateUser("ana@gmail.com");
    expect(() => joinCompany(andina(), user)).toThrow(/código/);
    expect(() => joinCompany(andina(), user, "MAL")).toThrow(/no es correcto/);
    expect(joinCompany(andina(), user, "andina7k2p").source).toBe("codigo");
  });

  it("asocia a su cuenta la invitación hecha por correo", () => {
    const user = getOrCreateUser("empleado19@andina-demo.co");
    const m = membershipFor("demo-andina", user)!;
    expect(m.userId).toBeUndefined();
    joinCompany(andina(), user);
    expect(m.userId).toBe(user.id);
    expect(membershipsForUser(user).map((x) => x.company.slug)).toEqual(["andina-logistica"]);
  });

  it("no deja volver a entrar a quien fue rechazado", () => {
    const user = getOrCreateUser("pedro@andina-demo.co");
    const m = joinCompany(andina(), user);
    m.status = "rechazado";
    expect(() => joinCompany(andina(), user)).toThrow(CompanyError);
  });

  it("cotiza solo los planes habilitados con la tarifa del tramo y guarda la elección", async () => {
    const user = getOrCreateUser("ana@andina-demo.co");
    const m = joinCompany(andina(), user);
    const { offers, context } = await quoteAsEmployee(andina(), m, req);
    expect(offers.map((o) => o.id).sort()).toEqual(["bolivar:auto-esencial", "bolivar:auto-plus"]);
    expect(context).toMatchObject({ enrolled: 18, tierPct: 5, next: { pct: 8, missing: 7 }, membershipStatus: "pendiente" });
    const sel = await choosePlan(andina(), m, req, "bolivar:auto-plus");
    expect(sel).toMatchObject({ planName: "Auto Plus", vehicleLabel: "Mazda 2 2022 · ABC123", tierPct: 5 });
    expect(sel.estimatedPremium).toBeLessThan(sel.listPremium);
    await expect(choosePlan(andina(), m, req, "bolivar:moto-basico")).rejects.toThrow(CompanyError);
  });
});

describe("panel de la empresa", () => {
  const andina = () => findCompanyBySlug("andina-logistica")!;

  it("da acceso según el rol y no a otros correos", () => {
    expect(companyRole(andina(), { email: "RRHH@andina-demo.co" })).toBe("admin");
    expect(companyRole(andina(), { email: "finanzas@andina-demo.co" })).toBe("lectura");
    expect(companyRole(andina(), { email: "empleado1@andina-demo.co" })).toBeNull();
  });

  it("aprueba en lote solo pendientes, sube el tramo, avisa y deja bitácora", () => {
    const pend = membersOf("demo-andina").filter((m) => m.status === "pendiente");
    const approved = membersOf("demo-andina").find((m) => m.status === "aprobado")!;
    expect(decideMemberships(andina(), [...pend.map((m) => m.id), approved.id], "aprobar", "rrhh@andina-demo.co")).toBe(2);
    expect(enrolledCount("demo-andina")).toBe(20);
    expect(db().outbox.filter((o) => /aprobó tu beneficio/.test(o.subject))).toHaveLength(2);
    expect(companyAuditFor("demo-andina")[0]).toMatchObject({ action: "Aprobó vinculaciones", detail: "2" });
  });

  it("rechaza con motivo", () => {
    const user = getOrCreateUser("intruso@andina-demo.co");
    const m = joinCompany(andina(), user);
    decideMemberships(andina(), [m.id], "rechazar", "rrhh@andina-demo.co", "No trabaja en la empresa");
    expect(m).toMatchObject({ status: "rechazado", reason: "No trabaja en la empresa" });
  });

  it("invita por CSV sin duplicar; el invitado no cuenta hasta entrar y entonces queda aprobado", () => {
    const r = inviteEmployees(andina(), [{ email: "nuevo@andina-demo.co", name: "Nuevo" }, { email: "empleado1@andina-demo.co" }], "rrhh@andina-demo.co");
    expect(r).toEqual({ created: 1, skipped: ["empleado1@andina-demo.co"] });
    const before = enrolledCount("demo-andina");
    const m = joinCompany(andina(), getOrCreateUser("nuevo@andina-demo.co"));
    expect(m).toMatchObject({ status: "aprobado", name: "Nuevo", decidedBy: "Invitación de la empresa" });
    expect(enrolledCount("demo-andina")).toBe(before + 1);
  });

  it("actualiza el programa de la empresa", () => {
    updateProgram(andina(), companyInputSchemaProgram({ paymentModel: "empresa", allowedPlanCodes: ["auto-plus"], enrollmentClosesAt: "2026-12-20" }), "rrhh@andina-demo.co");
    expect(andina()).toMatchObject({ paymentModel: "empresa", copayAmount: undefined, allowedPlanCodes: ["auto-plus"], enrollmentClosesAt: "2026-12-20" });
  });
});
