"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, requireAdmin } from "@/server/admin";
import { db, newId } from "@/server/db";
import { dispatchDueReminders } from "@/server/reminders";
import { updatePqr } from "@/server/pqr";
import { updateLead } from "@/server/leads";
import { reconcilePayments } from "@/server/reconciliation";
import { adminRefund, adminRetryIssuance, CheckoutError } from "@/server/orders";
import type { FormState } from "../cuenta/actions";
import { describeRule, type DiscountRule } from "@/domain/discounts";
import { setExperimentActive } from "@/server/experiments";
import { deleteDiscountRule, discountConfig, updateDiscountSettings, upsertDiscountRule } from "@/server/discounts";
import { companyInputSchema } from "@/domain/companies";
import { CompanyError, getCompany, logoToDataUrl, rotateJoinCode, saveCompany } from "@/server/companies";

const campaignSchema = z.object({
  sponsor: z.string().trim().min(2).max(60),
  title: z.string().trim().min(3).max(100),
  body: z.string().trim().min(10).max(400),
  ctaLabel: z.string().trim().min(2).max(30),
  ctaUrl: z.string().trim().refine((u) => u.startsWith("/") || u.startsWith("https://"), "URL inválida"),
  audience: z.enum(["auto", "moto", "todos"]),
  companyId: z.string().max(60).optional(),
});

export async function createCampaignAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = campaignSchema.safeParse({ ...Object.fromEntries(form), companyId: form.get("companyId") || undefined });
  if (!parsed.success) return { error: "Revisa los campos de la campaña (URL debe iniciar por / o https://)." };
  if (parsed.data.companyId && !getCompany(parsed.data.companyId)) return { error: "La empresa elegida no existe." };
  const id = newId();
  db().campaigns.set(id, { id, ...parsed.data, active: true, createdAt: new Date().toISOString() });
  audit(admin.email, "Creó campaña", `${parsed.data.sponsor}: ${parsed.data.title}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function toggleCampaignAction(id: string) {
  const admin = await requireAdmin();
  const c = db().campaigns.get(id);
  if (c) {
    c.active = !c.active;
    // Activarla es aprobar la campaña que creó una aseguradora.
    if (c.active && c.createdBy === "aseguradora" && !c.reviewedAt) c.reviewedAt = new Date().toISOString();
    audit(admin.email, c.active ? "Activó campaña" : "Pausó campaña", c.title);
  }
  revalidatePath("/admin");
}

export async function runRemindersAction() {
  const admin = await requireAdmin();
  // En el panel se fuerza el envío ignorando el horario, solo para demostración.
  const noon = new Date();
  noon.setUTCHours(17, 0, 0, 0);
  if (noon.getUTCDay() === 0) noon.setUTCDate(noon.getUTCDate() + 1);
  const { sent } = await dispatchDueReminders(noon);
  audit(admin.email, "Envió recordatorios manualmente", `${sent} mensajes`);
  revalidatePath("/admin");
}

const pqrUpdateSchema = z.object({
  status: z.enum(["radicada", "en_tramite", "respondida"]),
  response: z.string().trim().max(4000).optional(),
});

export async function updatePqrAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = pqrUpdateSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Datos inválidos." };
  if (parsed.data.status === "respondida" && !parsed.data.response) {
    return { error: "Escribe la respuesta para marcarla como respondida." };
  }
  const pqr = updatePqr(id, parsed.data.status, parsed.data.response);
  if (!pqr) return { error: "PQR no encontrada." };
  audit(admin.email, `PQR ${pqr.radicado} → ${parsed.data.status}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function reconcileAction() {
  const admin = await requireAdmin();
  const report = await reconcilePayments();
  audit(admin.email, "Concilió pagos", `${report.checked} revisados, ${report.updated} actualizados, ${report.issues.length} novedades`);
  revalidatePath("/admin");
}

// ── Descuentos y tarifas especiales ────────────────────────────────────────

const discountRuleSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{0,40}$/).optional(),
    insurerId: z.string().min(1).max(30),
    label: z.string().trim().min(3).max(60),
    source: z.enum(["aseguradora", "plataforma"]),
    kind: z.enum(["porcentaje", "valor"]),
    magnitude: z.coerce.number().positive(),
    maxAmount: z.union([z.literal(""), z.coerce.number().int().positive()]).optional(),
    planCodes: z.string().max(200).optional(),
    validFrom: z.union([z.literal(""), z.iso.date()]).optional(),
    validUntil: z.union([z.literal(""), z.iso.date()]).optional(),
  })
  .refine((r) => (r.kind === "porcentaje" ? r.magnitude <= 50 : r.magnitude <= 5_000_000), "Magnitud fuera de rango")
  .refine((r) => !r.validFrom || !r.validUntil || r.validFrom <= r.validUntil, "La vigencia termina antes de empezar");

export async function saveDiscountRuleAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = discountRuleSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { error: "Revisa la regla: porcentaje de 0 a 50, valor hasta $5.000.000 y una vigencia válida." };
  }
  const r = parsed.data;
  const vehicleTypes = (["auto", "moto"] as const).filter((t) => form.get(`vt_${t}`) === "on");
  const rule: DiscountRule = {
    id: r.id || `${r.insurerId === "*" ? "todas" : r.insurerId}-${newId().slice(0, 6)}`,
    insurerId: r.insurerId,
    label: r.label,
    source: r.source,
    kind: r.kind,
    magnitude: r.magnitude,
    maxAmount: r.maxAmount || undefined,
    enabled: form.get("enabled") === "on",
    vehicleTypes: vehicleTypes.length === 2 ? undefined : vehicleTypes,
    planCodes: r.planCodes?.split(",").map((s) => s.trim()).filter(Boolean),
    validFrom: r.validFrom || undefined,
    validUntil: r.validUntil || undefined,
    requires: form.get("requires") === "on" ? "invitacion" : undefined,
  };
  if (rule.planCodes?.length === 0) rule.planCodes = undefined;
  const existed = discountConfig().rules.some((x) => x.id === rule.id);
  upsertDiscountRule(rule);
  audit(admin.email, existed ? "Editó descuento" : "Creó descuento", describeRule(rule));
  revalidatePath("/admin");
  return { ok: true };
}

export async function toggleDiscountRuleAction(id: string) {
  const admin = await requireAdmin();
  const rule = discountConfig().rules.find((r) => r.id === id);
  if (rule) {
    rule.enabled = !rule.enabled;
    audit(admin.email, rule.enabled ? "Activó descuento" : "Apagó descuento", describeRule(rule));
  }
  revalidatePath("/admin");
}

export async function deleteDiscountRuleAction(id: string) {
  const admin = await requireAdmin();
  const rule = discountConfig().rules.find((r) => r.id === id);
  if (rule) {
    deleteDiscountRule(id);
    audit(admin.email, "Eliminó descuento", describeRule(rule));
  }
  revalidatePath("/admin");
}

const discountSettingsSchema = z.object({ maxTotalPct: z.coerce.number().min(0).max(50) });

export async function saveDiscountSettingsAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = discountSettingsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "El tope total va de 0% a 50%." };
  const settings = { enabled: form.get("enabled") === "on", maxTotalPct: parsed.data.maxTotalPct };
  updateDiscountSettings(settings);
  audit(admin.email, "Cambió la configuración de descuentos", `${settings.enabled ? "activos" : "apagados"}, tope ${settings.maxTotalPct}%`);
  revalidatePath("/admin");
  return { ok: true };
}

// ── Experimentos ───────────────────────────────────────────────────────────

export async function toggleExperimentAction(id: string, active: boolean) {
  const admin = await requireAdmin();
  setExperimentActive(id, active);
  audit(admin.email, active ? "Inició experimento" : "Detuvo experimento", id);
  revalidatePath("/admin");
}

// ── Órdenes ────────────────────────────────────────────────────────────────

export async function retryIssuanceAction(orderId: string): Promise<FormState> {
  const admin = await requireAdmin();
  try {
    const order = await adminRetryIssuance(orderId, admin.email);
    audit(admin.email, "Reintentó emisión", `${order.reference} → ${order.status}`);
  } catch (e) {
    if (e instanceof CheckoutError) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

const refundSchema = z.object({ reason: z.string().trim().min(5).max(300) });

export async function refundOrderAction(orderId: string, _: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = refundSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Escribe el motivo del reembolso (mínimo 5 caracteres)." };
  try {
    const order = adminRefund(orderId, admin.email, parsed.data.reason);
    audit(admin.email, "Registró reembolso", `${order.reference} · ${parsed.data.reason}`);
  } catch (e) {
    if (e instanceof CheckoutError) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

const leadUpdateSchema = z.object({
  status: z.enum(["nueva", "contactada", "vendida", "perdida"]),
  note: z.string().trim().max(500).optional(),
});

export async function updateLeadAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = leadUpdateSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Elige un estado válido." };
  if (!updateLead(id, admin.email, parsed.data.status, parsed.data.note || undefined)) return { error: "No encontramos la oportunidad." };
  revalidatePath("/admin");
  return { ok: true, message: "Oportunidad actualizada." };
}

// ── Empresas (beneficio para empleados) ───────────────────────────────────

const MAX_TIER_ROWS = 6;

export async function saveCompanyAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const tiers = Array.from({ length: MAX_TIER_ROWS }, (_, i) => ({
    minEmployees: form.get(`tier_min_${i}`),
    discountPct: form.get(`tier_pct_${i}`),
  })).filter((t) => t.minEmployees && t.discountPct);
  const parsed = companyInputSchema.safeParse({
    id: form.get("id") || undefined,
    name: form.get("name"),
    nit: form.get("nit") || undefined,
    slug: form.get("slug") || undefined,
    domains: form.get("domains") ?? "",
    admins: form.get("admins") ?? "",
    paymentModel: form.get("paymentModel"),
    copayAmount: form.get("copayAmount") ?? "",
    allowedPlanCodes: form.getAll("plans").map(String),
    tiers,
    status: form.get("status") === "pausada" ? "pausada" : "activa",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos de la empresa." };
  try {
    const logo = await logoToDataUrl(form.get("logo") as File | null);
    const company = saveCompany(parsed.data, logo, form.get("removeLogo") === "on");
    audit(admin.email, parsed.data.id ? "Editó empresa" : "Creó empresa", `${company.name} · ${company.tiers.map((t) => `${t.minEmployees}+: ${t.discountPct}%`).join(", ")}`);
  } catch (e) {
    if (e instanceof CompanyError) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin");
  revalidatePath("/empresas");
  return { ok: true };
}

export async function rotateJoinCodeAction(id: string) {
  const admin = await requireAdmin();
  const code = rotateJoinCode(id);
  audit(admin.email, "Cambió código de vinculación", `${id} → ${code}`);
  revalidatePath("/admin");
}
