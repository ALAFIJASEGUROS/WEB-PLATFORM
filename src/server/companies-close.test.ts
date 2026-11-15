import { beforeEach, describe, expect, it } from "vitest";
import type { CheckoutInput } from "@/domain/schemas";
import type { QuoteRequest } from "@/domain/types";
import { companyProgramSchema } from "@/domain/companies";
import { db, getOrCreateUser } from "./db";
import {
  choosePlan,
  closeDueEnrollments,
  closeEnrollment,
  companyChargeRows,
  findCompanyBySlug,
  joinCompany,
  membershipFor,
  quoteAsEmployee,
  retireMember,
  updateProgram,
} from "./companies";
import { approveWithoutGateway, CheckoutError, createOrder, startAcceptance } from "./orders";

beforeEach(() => {
  (globalThis as { __safDb?: unknown }).__safDb = undefined;
  (globalThis as { __safDiscounts?: unknown }).__safDiscounts = undefined;
});

const andina = () => findCompanyBySlug("andina-logistica")!;
const req: QuoteRequest = {
  vehicle: { type: "auto", plate: "ABC123", brand: "Mazda", model: "Mazda 2", year: 2022, commercialValue: 70_000_000 },
  driver: { birthdate: "1990-05-10", city: "Medellín" },
  answers: { priority: "equilibrio", use: "particular", parking: "cerrado", mileage: "medio", drivers: "solo", financed: false, deductibleTolerance: "medio", services: [], claimsLast3Years: 0 },
};

/** Empleado aprobado con el Auto Plus elegido. */
async function employee(email = "ana@andina-demo.co") {
  const user = getOrCreateUser(email);
  const m = joinCompany(andina(), user);
  m.status = "aprobado";
  await choosePlan(andina(), m, req, "bolivar:auto-plus");
  return { user, m };
}

const checkout = (over: Partial<CheckoutInput> = {}): CheckoutInput => ({
  quote: req,
  offerId: "bolivar:auto-plus",
  paymentPlan: "anual",
  policyholder: { firstName: "Ana", lastName: "Gómez", documentType: "CC", documentNumber: "1020304050", email: "ana@andina-demo.co", phone: "3001234567", address: "Calle 1 # 2-3" },
  consents: { terms: true, dataProcessing: true, marketing: false },
  kyc: { ocupacion: "empleado", ingresos: "2-5smmlv", pep: false },
  company: { slug: "andina-logistica", payroll: false },
  ...over,
});

describe("cierre de la inscripción", () => {
  it("fija el tramo, calcula el precio final y avisa a cada empleado", async () => {
    const { m } = await employee(); // 19 aprobados: tramo 5 %
    const r = await closeEnrollment(andina(), "rrhh@andina-demo.co");
    expect(r).toMatchObject({ enrolled: 19, discountPct: 5, priced: 1 });
    expect(m.selection?.finalPremium).toBe(m.selection?.estimatedPremium);
    expect(db().outbox.some((o) => o.to === "ana@andina-demo.co" && /precio final/.test(o.subject))).toBe(true);
    await expect(closeEnrollment(andina(), "x")).rejects.toThrow(/ya está cerrada/);
  });

  it("después del cierre los nuevos inscritos no cambian el tramo, y entran con el precio final", async () => {
    await closeEnrollment(andina(), "rrhh");
    for (let i = 0; i < 10; i++) joinCompany(andina(), getOrCreateUser(`extra${i}@andina-demo.co`)).status = "aprobado";
    const { m } = await employee("tarde@andina-demo.co");
    const { context } = await quoteAsEmployee(andina(), m, req);
    expect(context).toMatchObject({ closed: true, tierPct: 5, next: null });
    expect(m.selection?.finalPremium).toBeDefined();
  });

  it("una fecha de cierre nueva abre otro periodo", async () => {
    await closeEnrollment(andina(), "rrhh");
    updateProgram(andina(), companyProgramSchema.parse({ paymentModel: "copago", copayAmount: "600000", enrollmentClosesAt: "2027-06-30", allowedPlanCodes: ["auto-esencial", "auto-plus", "moto-plus"] }), "rrhh");
    const { m } = await employee();
    expect((await quoteAsEmployee(andina(), m, req)).context.closed).toBe(false);
  });

  it("el cron cierra solo las inscripciones cuya fecha llegó", async () => {
    andina().enrollmentClosesAt = "2026-11-10";
    expect(await closeDueEnrollments("2026-11-09")).toEqual({ closed: 0 });
    expect(await closeDueEnrollments("2026-11-10")).toEqual({ closed: 1 });
    expect(await closeDueEnrollments("2026-11-11")).toEqual({ closed: 0 });
  });
});

describe("compra con el beneficio", () => {
  it("no se puede confirmar antes del cierre ni otro plan ni en cuotas", async () => {
    const { user } = await employee();
    await expect(createOrder(checkout(), user.id)).rejects.toThrow(/cierre de la inscripción/);
    await closeEnrollment(andina(), "rrhh");
    await expect(createOrder(checkout({ offerId: "bolivar:auto-esencial" }), user.id)).rejects.toThrow(/plan que elegiste/);
    await expect(createOrder(checkout({ paymentPlan: "mensual" }), user.id)).rejects.toThrow(/anual/);
    await expect(createOrder(checkout(), undefined)).rejects.toBeInstanceOf(CheckoutError);
  });

  it("en copago el empleado paga solo su parte en línea y la empresa la suya en el cobro mensual", async () => {
    const { user, m } = await employee();
    await closeEnrollment(andina(), "rrhh");
    const final = m.selection!.finalPremium!;
    const order = await createOrder(checkout({ expectedAmount: final - 600_000 }), user.id);
    expect(order.company).toMatchObject({ channel: "wompi", companyPart: 600_000, employeePart: final - 600_000 });
    expect(order.amountInCents).toBe((final - 600_000) * 100);
    expect(order.provider).toBe("simulado");
    await expect(createOrder(checkout(), user.id)).rejects.toThrow(/Ya confirmaste/);
  });

  it("con descuento por nómina no pasa por la pasarela, guarda la autorización y emite la póliza", async () => {
    const { user } = await employee();
    await closeEnrollment(andina(), "rrhh");
    const order = await createOrder(checkout({ company: { slug: "andina-logistica", payroll: true } }), user.id);
    expect(order).toMatchObject({ amountInCents: 0, provider: "nomina" });
    expect(order.consentEvidence.map((c) => c.purpose)).toContain("payroll");
    startAcceptance(order, false);
    await approveWithoutGateway(order);
    expect(order.status).toBe("emitida");
    expect(companyChargeRows(andina())).toEqual([expect.objectContaining({ reference: order.reference, companyPart: 600_000, channel: "nomina" })]);
  });

  it("si la empresa paga todo, el empleado solo confirma", async () => {
    updateProgram(andina(), companyProgramSchema.parse({ paymentModel: "empresa", enrollmentClosesAt: "2026-12-05" }), "rrhh");
    const { user } = await employee();
    await closeEnrollment(andina(), "rrhh");
    const order = await createOrder(checkout({ expectedAmount: 0 }), user.id);
    expect(order.company).toMatchObject({ channel: "empresa", employeePart: 0 });
    await approveWithoutGateway(order);
    expect(order.status).toBe("emitida");
  });
});

describe("retiro", () => {
  it("retira al empleado sin tocar su póliza y le avisa", async () => {
    const { user, m } = await employee();
    retireMember(andina(), m.id, "rrhh@andina-demo.co");
    expect(membershipFor("demo-andina", user)?.status).toBe("retirado");
    expect(db().outbox.some((o) => /Saliste del beneficio/.test(o.subject))).toBe(true);
    expect(() => joinCompany(andina(), user)).toThrow(/no está activa/);
  });
});
