import "server-only";
import {
  companyDiscountRule,
  normalizeTiers,
  parseDomains,
  slugify,
  type Company,
  type companyInputSchema,
} from "@/domain/companies";
import { applyDiscounts, type DiscountContext } from "@/domain/discounts";
import { todayInColombia } from "@/domain/holidays";
import type { Offer } from "@/domain/types";
import type { z } from "zod";
import { db, newId } from "./db";
import { discountConfig } from "./discounts";

// Empresas del programa de beneficio para empleados (fase 1: alta, tramos y
// precio corporativo). El portal del empleado y el admin de la empresa llegan
// en las fases 2 y 3.

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
