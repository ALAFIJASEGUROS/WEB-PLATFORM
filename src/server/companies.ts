import "server-only";
import {
  canQuoteAsEmployee,
  companyDiscountRule,
  nextTier,
  normalizeTiers,
  parseDomains,
  slugify,
  tierFor,
  type Company,
  type CompanyQuoteContext,
  type companyInputSchema,
  type Membership,
  type MembershipSelection,
} from "@/domain/companies";
import { vehicleName } from "@/domain/labels";
import { quoteWithCache } from "@/insurers/cache";
import { applyDiscounts, type DiscountContext } from "@/domain/discounts";
import { todayInColombia } from "@/domain/holidays";
import type { Offer, QuoteRequest } from "@/domain/types";
import type { z } from "zod";
import { db, newId, type User } from "./db";
import { discountConfig } from "./discounts";

// Empresas del programa de beneficio para empleados: alta, tramos, precio
// corporativo (fase 1) y portal del empleado (fase 2). El admin de la empresa
// llega en la fase 3.

export const LOGO_MAX_BYTES = 200 * 1024;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export class CompanyError extends Error {}

export const listCompanies = () =>
  [...db().companies.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));

export const getCompany = (id: string) => db().companies.get(id) ?? null;

export const findCompanyBySlug = (slug: string) =>
  [...db().companies.values()].find((c) => c.slug === slug) ?? null;

export const findCompanyByJoinCode = (code: string) =>
  [...db().companies.values()].find((c) => c.joinCode === code.trim().toUpperCase()) ?? null;

/** Empresas cuyo dominio coincide con el correo (para la vinculación por dominio). */
export function companiesForEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) return [];
  return [...db().companies.values()].filter((c) => c.status === "activa" && c.emailDomains.includes(domain));
}

/** Empleados aprobados: definen el tramo de precio. */
export const enrolledCount = (companyId: string) =>
  [...db().memberships.values()].filter((m) => m.companyId === companyId && m.status === "aprobado").length;

export const pendingCount = (companyId: string) =>
  [...db().memberships.values()].filter((m) => m.companyId === companyId && m.status === "pendiente").length;

/** Código de vinculación legible y único: prefijo del nombre + 4 caracteres. */
function newJoinCode(name: string) {
  const prefix = slugify(name).replace(/-/g, "").toUpperCase().slice(0, 6) || "EMP";
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(4));
    const code = prefix + [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
    if (!findCompanyByJoinCode(code)) return code;
  }
}

function uniqueSlug(base: string, exceptId?: string) {
  const root = slugify(base) || "empresa";
  let slug = root;
  for (let i = 2; [...db().companies.values()].some((c) => c.slug === slug && c.id !== exceptId); i++) slug = `${root}-${i}`;
  return slug;
}

/** Valida y convierte el logo subido a data URL. `undefined` si no se subió archivo. */
export async function logoToDataUrl(file: File | null): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;
  if (!LOGO_TYPES.includes(file.type)) throw new CompanyError("El logo debe ser PNG, JPG, WebP o SVG.");
  if (file.size > LOGO_MAX_BYTES) throw new CompanyError("El logo pesa más de 200 KB.");
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  return `data:${file.type};base64,${base64}`;
}

/** Crea o actualiza una empresa desde el formulario del admin de la plataforma. */
export function saveCompany(input: z.output<typeof companyInputSchema>, logo?: string, removeLogo = false): Company {
  const prev = input.id ? db().companies.get(input.id) : undefined;
  if (input.id && !prev) throw new CompanyError("La empresa no existe.");
  const domains = parseDomains(input.domains);
  const clash = [...db().companies.values()].find((c) => c.id !== prev?.id && c.emailDomains.some((d) => domains.includes(d)));
  if (clash) throw new CompanyError(`El dominio ya está asignado a ${clash.name}.`);

  const company: Company = {
    id: prev?.id ?? newId(),
    name: input.name,
    slug: uniqueSlug(input.slug || input.name, prev?.id),
    ...(input.nit && { nit: input.nit }),
    logo: removeLogo ? undefined : (logo ?? prev?.logo),
    emailDomains: domains,
    joinCode: prev?.joinCode ?? newJoinCode(input.name),
    paymentModel: input.paymentModel,
    copayAmount: input.paymentModel === "copago" && input.copayAmount ? Number(input.copayAmount) : undefined,
    allowedPlanCodes: input.allowedPlanCodes,
    tiers: normalizeTiers(input.tiers),
    status: input.status,
    createdAt: prev?.createdAt ?? new Date().toISOString(),
    ...(prev?.demo && { demo: true }),
  };
  if (company.tiers.length === 0) throw new CompanyError("Define al menos un tramo válido.");
  db().companies.set(company.id, company);
  return company;
}

/** Genera un código nuevo (si el anterior se filtró fuera de la empresa). */
export function rotateJoinCode(id: string) {
  const c = db().companies.get(id);
  if (!c) throw new CompanyError("La empresa no existe.");
  c.joinCode = newJoinCode(c.name);
  return c.joinCode;
}

/**
 * Ofertas con la tarifa corporativa del tramo actual. Como es un descuento de
 * la aseguradora, no se acumula con otras promociones de la aseguradora: el
 * motor toma la más favorable y, si empatan, la corporativa. Sí se suma a los
 * descuentos de la plataforma, hasta el tope global.
 */
export function withCompanyPricing(offers: Offer[], companyId: string, ctx: DiscountContext = {}) {
  const company = getCompany(companyId);
  const { rules, settings } = discountConfig();
  const rule = company ? companyDiscountRule(company, enrolledCount(company.id)) : null;
  const all = rule ? [rule, ...rules] : rules;
  return offers.map((o) => applyDiscounts(o, all, settings, todayInColombia(), ctx));
}

// ── Portal del empleado (fase 2) ──────────────────────────────────────────

/** Vinculación del usuario a la empresa, por cuenta o por correo (p. ej. invitado por CSV). */
export function membershipFor(companyId: string, user: Pick<User, "id" | "email">): Membership | null {
  const email = user.email.toLowerCase();
  return (
    [...db().memberships.values()].find(
      (m) => m.companyId === companyId && (m.userId === user.id || (!m.userId && m.email.toLowerCase() === email)),
    ) ?? null
  );
}

export const membershipsForUser = (user: Pick<User, "id" | "email">) =>
  [...db().memberships.values()]
    .filter((m) => m.userId === user.id || (!m.userId && m.email.toLowerCase() === user.email.toLowerCase()))
    .map((m) => ({ membership: m, company: getCompany(m.companyId) }))
    .filter((x): x is { membership: Membership; company: Company } => !!x.company);

/** El correo pertenece a uno de los dominios de la empresa. */
export const emailMatchesCompany = (company: Company, email: string) =>
  company.emailDomains.includes(email.trim().toLowerCase().split("@")[1] ?? "");

/**
 * Vincula al usuario con la empresa: por su correo corporativo o con el código
 * que compartió la empresa. Queda pendiente hasta que el admin lo apruebe.
 */
export function joinCompany(company: Company, user: Pick<User, "id" | "email" | "name">, code?: string): Membership {
  if (company.status !== "activa") throw new CompanyError("El programa de esta empresa está pausado.");
  const existing = membershipFor(company.id, user);
  if (existing) {
    existing.userId ??= user.id;
    if (existing.status === "retirado" || existing.status === "rechazado") {
      throw new CompanyError("Tu vinculación no está activa. Habla con el área encargada en tu empresa.");
    }
    return existing;
  }
  let source: Membership["source"];
  if (emailMatchesCompany(company, user.email)) source = "dominio";
  else if (code && code.trim().toUpperCase() === company.joinCode) source = "codigo";
  else {
    throw new CompanyError(
      code ? "El código no es correcto. Revisa el que te compartió tu empresa." : "Tu correo no es de la empresa. Escribe el código que te compartió tu empresa.",
    );
  }
  const m: Membership = {
    id: newId(),
    companyId: company.id,
    userId: user.id,
    email: user.email.toLowerCase(),
    ...(user.name && { name: user.name }),
    status: "pendiente",
    source,
    createdAt: new Date().toISOString(),
  };
  db().memberships.set(m.id, m);
  return m;
}

export function companyQuoteContext(company: Company, membership: Membership): CompanyQuoteContext {
  const enrolled = enrolledCount(company.id);
  const tier = tierFor(enrolled, company.tiers);
  const next = nextTier(enrolled, company.tiers);
  return {
    slug: company.slug,
    name: company.name,
    membershipStatus: membership.status,
    enrolled,
    tierPct: tier?.discountPct ?? null,
    next: next ? { pct: next.tier.discountPct, missing: next.missing } : null,
    ...(company.enrollmentClosesAt && { enrollmentClosesAt: company.enrollmentClosesAt }),
  };
}

/** Planes habilitados por la empresa (si no habilitó ninguno, todos). */
const allowedOffers = (company: Company, offers: Offer[]) =>
  company.allowedPlanCodes.length === 0 ? offers : offers.filter((o) => company.allowedPlanCodes.includes(o.id.split(":")[1]));

/** Ofertas para un empleado: planes habilitados con la tarifa del tramo actual. */
export async function quoteAsEmployee(company: Company, membership: Membership, req: QuoteRequest) {
  if (!canQuoteAsEmployee(membership)) throw new CompanyError("Tu vinculación no permite cotizar con la tarifa corporativa.");
  const { offers, errors } = await quoteWithCache(req);
  return { offers: withCompanyPricing(allowedOffers(company, offers), company.id), errors, context: companyQuoteContext(company, membership) };
}

/** Guarda el plan que eligió el empleado; el precio final se fija al cierre del periodo. */
export async function choosePlan(company: Company, membership: Membership, req: QuoteRequest, offerId: string): Promise<MembershipSelection> {
  const { offers } = await quoteAsEmployee(company, membership, req);
  const offer = offers.find((o) => o.id === offerId);
  if (!offer) throw new CompanyError("Ese plan no está disponible para tu empresa. Cotiza de nuevo.");
  const v = req.vehicle;
  membership.selection = {
    offerId: offer.id,
    planName: offer.planName,
    insurerName: offer.insurerName,
    vehicleType: v.type,
    vehicleLabel: `${vehicleName(v.brand, v.model)} ${v.year}${v.plate ? ` · ${v.plate}` : ""}`,
    listPremium: offer.listPremium ?? offer.annualPremium,
    estimatedPremium: offer.annualPremium,
    tierPct: tierFor(enrolledCount(company.id), company.tiers)?.discountPct ?? null,
    quote: req,
    at: new Date().toISOString(),
  };
  return membership.selection;
}
