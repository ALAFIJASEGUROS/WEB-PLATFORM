// Seguro como beneficio para empleados (ver docs/empresas.md).
//
// Una empresa ofrece a sus empleados el seguro de su carro o moto personal con
// una tarifa corporativa que mejora por tramos según cuántos se inscriben. Este
// módulo es puro (sirve en cliente y servidor): tipos, tramos y la regla de
// descuento que se suma al motor de descuentos.

import { z } from "zod";
import type { DiscountRule } from "./discounts";
import type { QuoteRequest, VehicleType } from "./types";

/** Quién paga la prima. En copago la empresa aporta un monto fijo por empleado al año. */
export type PaymentModel = "empresa" | "empleado" | "copago";

export const PAYMENT_MODEL_LABELS: Record<PaymentModel, string> = {
  empresa: "La empresa paga todo",
  empleado: "El empleado paga (puede ser por nómina)",
  copago: "Copago: la empresa aporta una parte",
};

/** Tramo de precio: desde `minEmployees` inscritos se aplica `discountPct`. */
export interface VolumeTier {
  minEmployees: number;
  discountPct: number;
}

/** Tramos de ejemplo hasta negociar la tarifa corporativa con Bolívar. */
export const DEFAULT_TIERS: VolumeTier[] = [
  { minEmployees: 10, discountPct: 5 },
  { minEmployees: 25, discountPct: 8 },
  { minEmployees: 50, discountPct: 11 },
  { minEmployees: 100, discountPct: 14 },
];

export type CompanyStatus = "activa" | "pausada";

/** Rol en el panel de la empresa: administrador (aprueba y configura) o solo lectura. */
export type CompanyRole = "admin" | "lectura";
export interface CompanyAdmin {
  email: string;
  role: CompanyRole;
}

export interface Company {
  id: string;
  name: string;
  /** Identificador en la URL del portal: /empresas/{slug}. */
  slug: string;
  nit?: string;
  /** Logo como data URL (PNG, JPG, SVG o WebP, máx. 200 KB). */
  logo?: string;
  /** Dominios de correo que validan a un empleado, sin "@" (p. ej. "andina.com.co"). */
  emailDomains: string[];
  /** Código para vincularse por enlace. */
  joinCode: string;
  paymentModel: PaymentModel;
  /** Aporte anual de la empresa por empleado en copago, en COP. */
  copayAmount?: number;
  /** Códigos de plan habilitados (p. ej. "auto-plus"). Vacío: todos. */
  allowedPlanCodes: string[];
  tiers: VolumeTier[];
  /** Personas de la empresa con acceso a su panel (/empresas/{slug}/admin). */
  admins: CompanyAdmin[];
  /** Cierre del periodo de inscripción actual (fecha ISO). Al cerrar se fija el tramo. */
  enrollmentClosesAt?: string;
  status: CompanyStatus;
  createdAt: string;
  /** Datos de demostración, no una empresa real. */
  demo?: boolean;
}

/**
 * `invitado`: la empresa lo cargó por CSV y aún no entra; no cuenta para el tramo.
 * Al entrar con ese correo queda aprobado, porque la empresa ya lo invitó.
 */
export type MembershipStatus = "invitado" | "pendiente" | "aprobado" | "rechazado" | "retirado";
export type MembershipSource = "codigo" | "dominio" | "csv";

/** Plan que el empleado eligió durante el periodo de inscripción (paga al cierre). */
export interface MembershipSelection {
  offerId: string;
  planName: string;
  insurerName: string;
  vehicleType: VehicleType;
  /** "Mazda 2 2022 · ABC123" */
  vehicleLabel: string;
  listPremium: number;
  /** Prima con el tramo vigente al elegir. */
  estimatedPremium: number;
  tierPct: number | null;
  /** Datos para volver a cotizar al cierre; la empresa no los ve. */
  quote: QuoteRequest;
  at: string;
}

/** Vinculación de un empleado a una empresa. */
export interface Membership {
  id: string;
  companyId: string;
  userId?: string;
  email: string;
  name?: string;
  status: MembershipStatus;
  source: MembershipSource;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  reason?: string;
  selection?: MembershipSelection;
}

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  invitado: "Invitado por la empresa",
  pendiente: "Pendiente de aprobación",
  aprobado: "Aprobado",
  rechazado: "No aprobado",
  retirado: "Retirado",
};

/** Lo que ve el empleado de su empresa al cotizar (sin datos de otros empleados). */
export interface CompanyQuoteContext {
  slug: string;
  name: string;
  membershipStatus: MembershipStatus;
  enrolled: number;
  tierPct: number | null;
  next: { pct: number; missing: number } | null;
  enrollmentClosesAt?: string;
}

/** Un empleado puede cotizar y elegir plan mientras su vinculación esté pendiente o aprobada. */
export const canQuoteAsEmployee = (m: Pick<Membership, "status"> | null | undefined) =>
  !!m && (m.status === "pendiente" || m.status === "aprobado");

/** Ordena los tramos y descarta los inválidos o repetidos. */
export function normalizeTiers(tiers: VolumeTier[]): VolumeTier[] {
  const valid = tiers.filter(
    (t) => Number.isInteger(t.minEmployees) && t.minEmployees >= 1 && t.discountPct > 0 && t.discountPct <= 50,
  );
  const byMin = new Map(valid.map((t) => [t.minEmployees, t]));
  return [...byMin.values()].sort((a, b) => a.minEmployees - b.minEmployees);
}

/** Tramo alcanzado con `enrolled` empleados inscritos, o `null` si aún no llegan al primero. */
export function tierFor(enrolled: number, tiers: VolumeTier[]): VolumeTier | null {
  let current: VolumeTier | null = null;
  for (const t of normalizeTiers(tiers)) if (enrolled >= t.minEmployees) current = t;
  return current;
}

/** Siguiente tramo y cuántos inscritos faltan para alcanzarlo. */
export function nextTier(enrolled: number, tiers: VolumeTier[]): { tier: VolumeTier; missing: number } | null {
  const t = normalizeTiers(tiers).find((x) => enrolled < x.minEmployees);
  return t ? { tier: t, missing: t.minEmployees - enrolled } : null;
}

/** Ahorro anual estimado para la empresa: prima promedio × inscritos × descuento del tramo. */
export function estimatedSavings(enrolled: number, averagePremium: number, tiers: VolumeTier[]): number {
  const t = tierFor(enrolled, tiers);
  return t ? Math.round(enrolled * averagePremium * (t.discountPct / 100)) : 0;
}

/**
 * Regla de descuento de la tarifa corporativa para el tramo actual. Se suma a
 * las demás reglas y respeta el tope global del motor de descuentos.
 */
export function companyDiscountRule(company: Company, enrolled: number): DiscountRule | null {
  const t = tierFor(enrolled, company.tiers);
  if (!t || company.status !== "activa") return null;
  return {
    id: `empresa-${company.id}`,
    insurerId: "*",
    label: `Tarifa corporativa ${company.name}`,
    source: "aseguradora",
    kind: "porcentaje",
    magnitude: t.discountPct,
    enabled: true,
    ...(company.allowedPlanCodes.length > 0 && { planCodes: company.allowedPlanCodes }),
  };
}

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

/** "@Andina.com.co, otra.co" → ["andina.com.co", "otra.co"] */
export function parseDomains(raw: string): string[] {
  const list = raw
    .split(/[\s,;]+/)
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  return [...new Set(list)];
}

const DOMAIN = /^(?=.{3,63}$)[a-z0-9-]+(\.[a-z0-9-]+)+$/;
/** Dominios públicos que no sirven para validar que alguien trabaja en una empresa. */
export const PUBLIC_EMAIL_DOMAINS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com", "live.com"];

/** Formulario del admin de la plataforma para crear o editar una empresa. */
export const companyInputSchema = z
  .object({
    id: z.string().max(60).optional(),
    name: z.string().trim().min(2, "Escribe el nombre de la empresa.").max(80),
    nit: z.string().trim().max(20).optional(),
    slug: z.string().trim().max(40).optional(),
    domains: z.string().max(300).default(""),
    admins: z.string().max(1000).default(""),
    paymentModel: z.enum(["empresa", "empleado", "copago"]),
    copayAmount: z.union([z.literal(""), z.coerce.number().int().min(0).max(20_000_000)]).optional(),
    allowedPlanCodes: z.array(z.string().max(40)).max(20).default([]),
    tiers: z
      .array(z.object({ minEmployees: z.coerce.number().int().min(1).max(100_000), discountPct: z.coerce.number().min(0.5).max(50) }))
      .min(1, "Define al menos un tramo.")
      .max(8),
    status: z.enum(["activa", "pausada"]).default("activa"),
  })
  .superRefine((c, ctx) => {
    const domains = parseDomains(c.domains);
    const bad = domains.filter((d) => !DOMAIN.test(d));
    if (bad.length) ctx.addIssue({ code: "custom", path: ["domains"], message: `Dominio no válido: ${bad.join(", ")}` });
    const { invalid } = parseCompanyAdmins(c.admins);
    if (invalid.length) ctx.addIssue({ code: "custom", path: ["admins"], message: `Administrador no válido: ${invalid.join(", ")} (usa correo:admin o correo:lectura).` });
    const pub = domains.filter((d) => PUBLIC_EMAIL_DOMAINS.includes(d));
    if (pub.length) ctx.addIssue({ code: "custom", path: ["domains"], message: `${pub.join(", ")} es un correo público; usa el dominio de la empresa.` });
    if (c.paymentModel === "copago" && !c.copayAmount) {
      ctx.addIssue({ code: "custom", path: ["copayAmount"], message: "Indica cuánto aporta la empresa en el copago." });
    }
  });
export type CompanyInput = z.input<typeof companyInputSchema>;

// ── Panel de la empresa (fase 3) ──────────────────────────────────────────

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "ana@x.co:admin, luis@x.co:lectura" → administradores de la empresa. */
export function parseCompanyAdmins(raw: string): { admins: CompanyAdmin[]; invalid: string[] } {
  const admins = new Map<string, CompanyAdmin>();
  const invalid: string[] = [];
  for (const part of raw.split(/[\s,;]+/).filter(Boolean)) {
    const [email, role = "admin"] = part.toLowerCase().split(":");
    if (!EMAIL.test(email) || (role !== "admin" && role !== "lectura")) invalid.push(part);
    else admins.set(email, { email, role });
  }
  return { admins: [...admins.values()], invalid };
}

export interface EmployeeRow {
  name?: string;
  email: string;
}

/**
 * Lista de empleados pegada o subida como CSV: una persona por línea, con
 * "nombre, correo" o solo el correo, separado por coma, punto y coma o tabulación.
 * La primera línea se ignora si es un encabezado.
 */
export function parseEmployeeList(text: string, max = 1000) {
  const valid: EmployeeRow[] = [];
  const invalid: string[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const [i, line] of lines.entries()) {
    const cells = line.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, "").trim()).filter(Boolean);
    const email = cells.find((c) => EMAIL.test(c))?.toLowerCase();
    if (!email) {
      if (i === 0 && /correo|email/i.test(line)) continue; // encabezado
      invalid.push(line.slice(0, 80));
      continue;
    }
    if (seen.has(email)) {
      duplicates.push(email);
      continue;
    }
    seen.add(email);
    const name = cells.find((c) => !EMAIL.test(c));
    valid.push({ email, ...(name && { name: name.slice(0, 80) }) });
  }
  return { valid: valid.slice(0, max), invalid, duplicates, tooMany: valid.length > max };
}

/** Lo que la empresa configura de su programa (los tramos y dominios los negocia SeguAlaFija). */
export const companyProgramSchema = z
  .object({
    paymentModel: z.enum(["empresa", "empleado", "copago"]),
    copayAmount: z.union([z.literal(""), z.coerce.number().int().min(0).max(20_000_000)]).optional(),
    allowedPlanCodes: z.array(z.string().max(40)).max(20).default([]),
    enrollmentClosesAt: z.union([z.literal(""), z.iso.date("Escribe una fecha válida.")]).optional(),
  })
  .superRefine((c, ctx) => {
    if (c.paymentModel === "copago" && !c.copayAmount) {
      ctx.addIssue({ code: "custom", path: ["copayAmount"], message: "Indica cuánto aporta la empresa en el copago." });
    }
  });

/** Parte que paga la empresa y parte del empleado, según el modelo de pago. */
export function splitPremium(company: Pick<Company, "paymentModel" | "copayAmount">, annual: number) {
  const companyPart =
    company.paymentModel === "empresa" ? annual : company.paymentModel === "copago" ? Math.min(annual, company.copayAmount ?? 0) : 0;
  return { companyPart, employeePart: annual - companyPart };
}

/** Filas del reporte para nómina: empleados aprobados con plan elegido. */
export function payrollRows(company: Company, members: Membership[]) {
  return members
    .filter((m) => m.status === "aprobado" && m.selection)
    .map((m) => {
      const s = m.selection!;
      const { companyPart, employeePart } = splitPremium(company, s.estimatedPremium);
      return {
        name: m.name ?? "",
        email: m.email,
        plan: s.planName,
        vehicle: s.vehicleType === "auto" ? "Carro" : "Moto",
        annual: s.estimatedPremium,
        companyPart,
        employeePart,
        employeeMonthly: Math.round(employeePart / 12),
      };
    });
}

/** Ahorro anual del equipo frente al precio sin tarifa corporativa (planes elegidos y aprobados). */
export const teamSavings = (members: Membership[]) =>
  members
    .filter((m) => m.status === "aprobado" && m.selection)
    .reduce((s, m) => s + (m.selection!.listPremium - m.selection!.estimatedPremium), 0);
