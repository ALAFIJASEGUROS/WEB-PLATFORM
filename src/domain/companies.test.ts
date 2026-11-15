import { describe, expect, it } from "vitest";
import type { QuoteRequest } from "./types";
import { applyDiscounts, DEFAULT_DISCOUNT_SETTINGS } from "./discounts";
import {
  companyProgramSchema,
  parseCompanyAdmins,
  parseEmployeeList,
  payrollRows,
  splitPremium,
  teamSavings,
  type Membership,
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
  admins: [],
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

describe("panel de la empresa", () => {
  it("lee administradores con su rol", () => {
    expect(parseCompanyAdmins("RRHH@andina.co:admin, fin@andina.co:lectura ana@andina.co")).toEqual({
      admins: [
        { email: "rrhh@andina.co", role: "admin" },
        { email: "fin@andina.co", role: "lectura" },
        { email: "ana@andina.co", role: "admin" },
      ],
      invalid: [],
    });
    expect(parseCompanyAdmins("ana@andina.co:jefe, nocorreo").invalid).toEqual(["ana@andina.co:jefe", "nocorreo"]);
  });

  it("lee la lista de empleados con encabezado, separadores mixtos, duplicados e inválidos", () => {
    const r = parseEmployeeList("nombre;correo\nAna Gómez;ANA@andina.co\n\"Luis Pérez\",luis@andina.co\nana@andina.co\nsin correo\npedro@andina.co");
    expect(r.valid).toEqual([
      { name: "Ana Gómez", email: "ana@andina.co" },
      { name: "Luis Pérez", email: "luis@andina.co" },
      { email: "pedro@andina.co" },
    ]);
    expect(r.duplicates).toEqual(["ana@andina.co"]);
    expect(r.invalid).toEqual(["sin correo"]);
  });

  it("reparte la prima según quién paga", () => {
    expect(splitPremium({ paymentModel: "empresa" }, 1_000_000)).toEqual({ companyPart: 1_000_000, employeePart: 0 });
    expect(splitPremium({ paymentModel: "empleado" }, 1_000_000)).toEqual({ companyPart: 0, employeePart: 1_000_000 });
    expect(splitPremium({ paymentModel: "copago", copayAmount: 600_000 }, 1_000_000)).toEqual({ companyPart: 600_000, employeePart: 400_000 });
    expect(splitPremium({ paymentModel: "copago", copayAmount: 600_000 }, 500_000)).toEqual({ companyPart: 500_000, employeePart: 0 });
  });

  it("arma el reporte para nómina solo con aprobados que eligieron plan, sin placa", () => {
    const sel = { offerId: "bolivar:auto-plus", planName: "Auto Plus", insurerName: "Seguros Bolívar", vehicleType: "auto" as const, vehicleLabel: "Mazda 2 2022 · ABC123", listPremium: 1_350_000, estimatedPremium: 1_284_000, tierPct: 5, quote: req, at: "" };
    const m = (status: Membership["status"], selection?: typeof sel): Membership => ({ id: status, companyId: "c1", email: `${status}@a.co`, name: "Ana", status, source: "dominio", createdAt: "", selection });
    const members = [m("aprobado", sel), m("aprobado"), m("pendiente", sel)];
    const rows = payrollRows({ ...company, paymentModel: "copago", copayAmount: 600_000 }, members);
    expect(rows).toEqual([{ name: "Ana", email: "aprobado@a.co", plan: "Auto Plus", vehicle: "Carro", annual: 1_284_000, companyPart: 600_000, employeePart: 684_000, employeeMonthly: 57_000 }]);
    expect(JSON.stringify(rows)).not.toContain("ABC123");
    expect(teamSavings(members)).toBe(66_000);
  });

  it("valida la configuración del programa", () => {
    expect(companyProgramSchema.safeParse({ paymentModel: "copago" }).success).toBe(false);
    expect(companyProgramSchema.safeParse({ paymentModel: "empleado", enrollmentClosesAt: "2026-12-05" }).success).toBe(true);
    expect(companyProgramSchema.safeParse({ paymentModel: "empleado", enrollmentClosesAt: "mañana" }).success).toBe(false);
  });
});
