import "server-only";
import {
  canQuoteAsEmployee,
  companyDiscountRule,
  effectiveDiscountPct,
  isEnrollmentClosed,
  nextTier,
  normalizeTiers,
  parseCompanyAdmins,
  parseDomains,
  slugify,
  tierFor,
  type Company,
  splitPremium,
  type companyProgramSchema,
  type CompanyQuoteContext,
  type CompanyRole,
  type EmployeeRow,
  type companyInputSchema,
  type Membership,
  type MembershipSelection,
} from "@/domain/companies";
import { formatCOP, vehicleName } from "@/domain/labels";
import { quoteWithCache } from "@/insurers/cache";
import { applyDiscounts, type DiscountContext } from "@/domain/discounts";
import { todayInColombia } from "@/domain/holidays";
import type { Offer, QuoteRequest } from "@/domain/types";
import type { z } from "zod";
import { db, newId, sendMessage, type User } from "./db";
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
    admins: parseCompanyAdmins(input.admins).admins,
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
    if (existing.status === "retirado" || existing.status === "rechazado") {
      throw new CompanyError("Tu vinculación no está activa. Habla con el área encargada en tu empresa.");
    }
    existing.userId ??= user.id;
    if (user.name && !existing.name) existing.name = user.name;
    // La empresa ya lo invitó: queda aprobado al entrar.
    if (existing.status === "invitado") {
      existing.status = "aprobado";
      existing.decidedAt = new Date().toISOString();
      existing.decidedBy = "Invitación de la empresa";
      companyAudit(company.id, existing.email, "Aceptó la invitación");
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
  const closed = isEnrollmentClosed(company);
  const next = closed ? null : nextTier(enrolled, company.tiers);
  return {
    slug: company.slug,
    name: company.name,
    membershipStatus: membership.status,
    enrolled: closed ? company.lockedTier!.enrolled : enrolled,
    tierPct: effectiveDiscountPct(company, enrolled),
    next: next ? { pct: next.tier.discountPct, missing: next.missing } : null,
    ...(company.enrollmentClosesAt && { enrollmentClosesAt: company.enrollmentClosesAt }),
    closed,
    paymentModel: company.paymentModel,
    ...(company.copayAmount && { copayAmount: company.copayAmount }),
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
    tierPct: effectiveDiscountPct(company, enrolledCount(company.id)),
    quote: req,
    at: new Date().toISOString(),
    // Si la inscripción ya cerró (llegó tarde o la aprobaron después), el precio ya es el final.
    ...(isEnrollmentClosed(company) && { finalPremium: offer.annualPremium, finalizedAt: new Date().toISOString() }),
  };
  return membership.selection;
}

// ── Panel de la empresa (fase 3) ──────────────────────────────────────────

/** Rol del usuario en el panel de la empresa, o null si no tiene acceso. */
export function companyRole(company: Company, user: Pick<User, "email"> | null): CompanyRole | null {
  if (!user) return null;
  return company.admins.find((a) => a.email === user.email.toLowerCase())?.role ?? null;
}

/** Empresas que el usuario administra (para enlazar el panel). */
export const companiesAdministeredBy = (user: Pick<User, "email">) =>
  listCompanies().filter((c) => companyRole(c, user));

export function companyAudit(companyId: string, actor: string, action: string, detail = "") {
  const log = db().companyAudit;
  log.unshift({ id: newId(), companyId, at: new Date().toISOString(), actor, action, detail });
  if (log.length > 2000) log.length = 2000;
}

export const companyAuditFor = (companyId: string, limit = 30) =>
  db().companyAudit.filter((e) => e.companyId === companyId).slice(0, limit);

const STATUS_ORDER: Record<Membership["status"], number> = { pendiente: 0, aprobado: 1, invitado: 2, rechazado: 3, retirado: 4 };

export const membersOf = (companyId: string) =>
  [...db().memberships.values()]
    .filter((m) => m.companyId === companyId)
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.email.localeCompare(b.email));

/** Aprueba o rechaza vinculaciones pendientes y avisa a cada empleado. Devuelve cuántas cambió. */
export function decideMemberships(company: Company, ids: string[], decision: "aprobar" | "rechazar", actor: string, reason?: string) {
  let changed = 0;
  const now = new Date().toISOString();
  for (const id of ids) {
    const m = db().memberships.get(id);
    if (!m || m.companyId !== company.id || m.status !== "pendiente") continue;
    m.status = decision === "aprobar" ? "aprobado" : "rechazado";
    m.decidedAt = now;
    m.decidedBy = actor;
    m.reason = decision === "rechazar" ? reason?.trim() || undefined : undefined;
    changed++;
    sendMessage({
      to: m.email,
      channel: "email",
      kind: "transaccional",
      subject: decision === "aprobar" ? `${company.name} aprobó tu beneficio de seguro` : `Sobre tu solicitud del beneficio de ${company.name}`,
      body:
        decision === "aprobar"
          ? `Hola${m.name ? ` ${m.name}` : ""}, ya haces parte del beneficio de seguro de ${company.name}. Puedes cotizar y elegir tu plan en /empresas/${company.slug}.`
          : `Hola${m.name ? ` ${m.name}` : ""}, ${company.name} no aprobó tu vinculación al beneficio${m.reason ? `: ${m.reason}` : "."} Si crees que es un error, habla con el área encargada.`,
    });
  }
  if (changed) companyAudit(company.id, actor, decision === "aprobar" ? "Aprobó vinculaciones" : "Rechazó vinculaciones", `${changed}${reason ? ` · ${reason}` : ""}`);
  return changed;
}

/**
 * Invita empleados de la lista (CSV): crea vinculaciones "invitado" y envía un
 * correo con el enlace. Omite a quien ya está en la empresa.
 */
export function inviteEmployees(company: Company, rows: EmployeeRow[], actor: string) {
  const existing = new Set(membersOf(company.id).map((m) => m.email.toLowerCase()));
  let created = 0;
  const skipped: string[] = [];
  for (const r of rows) {
    if (existing.has(r.email)) {
      skipped.push(r.email);
      continue;
    }
    const m: Membership = {
      id: newId(),
      companyId: company.id,
      email: r.email,
      ...(r.name && { name: r.name }),
      status: "invitado",
      source: "csv",
      createdAt: new Date().toISOString(),
    };
    db().memberships.set(m.id, m);
    existing.add(r.email);
    created++;
    sendMessage({
      to: r.email,
      channel: "email",
      kind: "transaccional",
      subject: `${company.name} te invita a asegurar tu carro o moto con tarifa corporativa`,
      body: `Hola${r.name ? ` ${r.name}` : ""}, ${company.name} te ofrece el seguro de tu carro o moto personal con Seguros Bolívar a tarifa corporativa. Entra con este correo en /empresas/${company.slug} para cotizar y elegir tu plan.`,
    });
  }
  if (created) companyAudit(company.id, actor, "Invitó empleados", `${created} invitados${skipped.length ? `, ${skipped.length} ya estaban` : ""}`);
  return { created, skipped };
}

/** La empresa actualiza su programa: planes, quién paga y cierre de la inscripción. */
export function updateProgram(company: Company, input: z.output<typeof companyProgramSchema>, actor: string) {
  company.paymentModel = input.paymentModel;
  company.copayAmount = input.paymentModel === "copago" && input.copayAmount ? Number(input.copayAmount) : undefined;
  company.allowedPlanCodes = input.allowedPlanCodes;
  company.enrollmentClosesAt = input.enrollmentClosesAt || undefined;
  companyAudit(
    company.id,
    actor,
    "Actualizó el programa",
    `${company.paymentModel}${company.copayAmount ? ` (${company.copayAmount})` : ""} · ${company.allowedPlanCodes.length || "todos los"} planes${company.enrollmentClosesAt ? ` · cierre ${company.enrollmentClosesAt}` : ""}`,
  );
}

// ── Cierre, cobro y retiro (fase 4) ───────────────────────────────────────

/**
 * Cierra la inscripción del periodo vigente: fija el tramo con los inscritos de
 * hoy, recalcula el precio final de cada plan elegido y avisa a cada empleado.
 */
export async function closeEnrollment(company: Company, actor: string) {
  if (!company.enrollmentClosesAt) throw new CompanyError("Primero define la fecha de cierre de la inscripción.");
  if (isEnrollmentClosed(company)) throw new CompanyError("La inscripción de este periodo ya está cerrada.");
  const enrolled = enrolledCount(company.id);
  company.lockedTier = {
    discountPct: tierFor(enrolled, company.tiers)?.discountPct ?? null,
    enrolled,
    closedAt: new Date().toISOString(),
    periodEnd: company.enrollmentClosesAt,
  };
  let priced = 0;
  let unavailable = 0;
  for (const m of membersOf(company.id)) {
    if (m.status !== "aprobado" || !m.selection) continue;
    const s = m.selection;
    const offer = (await quoteAsEmployee(company, m, s.quote).catch(() => null))?.offers.find((o) => o.id === s.offerId);
    if (!offer) {
      unavailable++;
      sendMessage({
        to: m.email,
        channel: "email",
        kind: "transaccional",
        subject: `Elige de nuevo tu plan del beneficio de ${company.name}`,
        body: `El plan ${s.planName} ya no está disponible en el beneficio de ${company.name}. Entra a /empresas/${company.slug} para elegir otro.`,
      });
      continue;
    }
    s.finalPremium = offer.annualPremium;
    s.finalizedAt = new Date().toISOString();
    priced++;
    const { employeePart } = splitPremium(company, offer.annualPremium);
    sendMessage({
      to: m.email,
      channel: "email",
      kind: "transaccional",
      subject: `Tu precio final del beneficio de ${company.name}`,
      body: [
        `Hola${m.name ? ` ${m.name}` : ""}, cerró la inscripción con ${enrolled} inscritos${company.lockedTier.discountPct ? ` y un descuento del ${company.lockedTier.discountPct} %` : ""}.`,
        `Tu ${s.planName} queda en ${formatCOP(offer.annualPremium)} al año${employeePart !== offer.annualPremium ? `; tu parte es ${formatCOP(employeePart)}` : ""}.`,
        `Confirma${employeePart > 0 ? " y paga" : ""} en /empresas/${company.slug} para que emitamos tu póliza.`,
      ].join("\n\n"),
    });
  }
  companyAudit(
    company.id,
    actor,
    "Cerró la inscripción",
    `${enrolled} inscritos · ${company.lockedTier.discountPct ? `${company.lockedTier.discountPct} %` : "sin descuento"} · ${priced} precios finales${unavailable ? ` · ${unavailable} deben elegir otro plan` : ""}`,
  );
  return { enrolled, priced, unavailable, discountPct: company.lockedTier.discountPct };
}

/** Cierra las inscripciones cuya fecha ya llegó. Lo llama el cron diario. */
export async function closeDueEnrollments(today = todayInColombia()) {
  let closed = 0;
  for (const c of listCompanies()) {
    if (c.status !== "activa" || !c.enrollmentClosesAt || c.enrollmentClosesAt > today || isEnrollmentClosed(c)) continue;
    await closeEnrollment(c, "Cierre automático");
    closed++;
  }
  return { closed };
}

/**
 * Retira a un empleado del programa. Su póliza sigue vigente hasta el
 * vencimiento y al renovar se cotiza a precio individual.
 */
export function retireMember(company: Company, membershipId: string, actor: string) {
  const m = db().memberships.get(membershipId);
  if (!m || m.companyId !== company.id) throw new CompanyError("No encontramos a esa persona en la empresa.");
  if (m.status === "retirado") return m;
  m.status = "retirado";
  m.decidedAt = new Date().toISOString();
  m.decidedBy = actor;
  sendMessage({
    to: m.email,
    channel: "email",
    kind: "transaccional",
    subject: `Saliste del beneficio de seguro de ${company.name}`,
    body: `Hola${m.name ? ` ${m.name}` : ""}, ya no haces parte del beneficio de ${company.name}. Si tienes una póliza, sigue vigente hasta su vencimiento; al renovar te mostraremos el precio individual.`,
  });
  companyAudit(company.id, actor, "Retiró a un empleado", m.email);
  return m;
}

/** Cobro mensual a la empresa: su parte de cada póliza pagada o emitida. */
export function companyChargeRows(company: Company) {
  return [...db().orders.values()]
    .filter((o) => o.company?.id === company.id && o.company.companyPart > 0 && (o.status === "aprobada" || o.status === "emitida"))
    .map((o) => ({
      reference: o.reference,
      date: o.createdAt.slice(0, 10),
      name: `${o.policyholder.firstName} ${o.policyholder.lastName}`,
      email: o.policyholder.email,
      plan: o.offer.planName,
      annual: o.offer.annualPremium,
      companyPart: o.company!.companyPart,
      employeePart: o.company!.employeePart,
      channel: o.company!.channel,
    }));
}
