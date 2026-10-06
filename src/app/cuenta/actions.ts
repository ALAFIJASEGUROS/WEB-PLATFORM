"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logout, requestOtp, requireUser, verifyOtp } from "@/server/auth";
import {
  attachPolicyToUser,
  db,
  newId,
  randomToken,
  type Policy,
  type Reminder,
  type UserVehicle,
} from "@/server/db";
import { normalizePlate, plateType } from "@/vehicles/lookup";

export type FormState = { ok?: boolean; error?: string; demoCode?: string; email?: string };

// ── Acceso ─────────────────────────────────────────────────────────────────

export async function requestCodeAction(_: FormState, form: FormData): Promise<FormState> {
  const email = z.email().safeParse(String(form.get("email") ?? "").trim());
  if (!email.success) return { error: "Escribe un correo válido." };
  const { demoCode } = await requestOtp(email.data);
  return { ok: true, email: email.data, demoCode };
}

export async function verifyCodeAction(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "");
  const code = String(form.get("code") ?? "");
  if (!/^\d{6}$/.test(code)) return { email, error: "El código tiene 6 dígitos." };
  const res = await verifyOtp(email, code);
  if (!res.ok) return { email, error: res.error };
  redirect("/cuenta");
}

export async function logoutAction() {
  await logout();
  redirect("/");
}

// ── Perfil y preferencias ──────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().trim().max(80),
  phone: z.union([z.literal(""), z.string().regex(/^3\d{9}$/)]),
});

export async function updateProfileAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: form.get("name") ?? "",
    phone: form.get("phone") ?? "",
  });
  if (!parsed.success) return { error: "Revisa el celular (10 dígitos, empieza por 3)." };
  user.name = parsed.data.name || undefined;
  user.phone = parsed.data.phone || undefined;
  user.channels = {
    email: form.get("ch_email") === "on",
    whatsapp: form.get("ch_whatsapp") === "on" && !!user.phone,
  };
  user.marketingConsent = form.get("marketing") === "on";
  revalidatePath("/cuenta", "layout");
  return { ok: true };
}

export async function setMarketingConsentAction(value: boolean) {
  const user = await requireUser();
  user.marketingConsent = value;
  revalidatePath("/cuenta", "layout");
}

// ── Vehículos ──────────────────────────────────────────────────────────────

const dateOrEmpty = z.union([z.literal(""), z.iso.date()]);
const vehicleSchema = z.object({
  plate: z.string().transform(normalizePlate).refine((p) => !!plateType(p), "Placa inválida"),
  brand: z.string().trim().min(2).max(40),
  model: z.string().trim().min(1).max(60),
  year: z.coerce.number().int().min(1970).max(2027),
  soatExpiry: dateOrEmpty,
  rtmExpiry: dateOrEmpty,
});

function upsertAutoReminder(
  userId: string,
  vehicle: UserVehicle,
  kind: "soat" | "tecnomecanica",
  date?: string,
) {
  const d = db();
  const existing = [...d.reminders.values()].find(
    (r) => r.vehicleId === vehicle.id && r.kind === kind && r.auto,
  );
  if (!date) {
    if (existing) d.reminders.delete(existing.id);
    return;
  }
  const title = `${kind === "soat" ? "Renovar SOAT" : "Revisión técnico-mecánica"} · ${vehicle.plate}`;
  if (existing) {
    Object.assign(existing, { dueDate: date, title, lastSentAt: undefined });
  } else {
    const r: Reminder = { id: newId(), userId, kind, title, dueDate: date, daysBefore: 15, vehicleId: vehicle.id, auto: true };
    d.reminders.set(r.id, r);
  }
}

export async function saveVehicleAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = vehicleSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Revisa los datos del vehículo (placa ABC123 o ABC12D)." };
  const data = parsed.data;
  const d = db();
  const id = String(form.get("id") ?? "");
  let vehicle = id ? d.vehicles.get(id) : [...d.vehicles.values()].find((v) => v.userId === user.id && v.plate === data.plate);
  if (vehicle && vehicle.userId !== user.id) return { error: "No autorizado." };
  if (!vehicle) {
    vehicle = { id: newId(), userId: user.id, type: plateType(data.plate)!, plate: data.plate, brand: data.brand, model: data.model, year: data.year };
    d.vehicles.set(vehicle.id, vehicle);
  }
  Object.assign(vehicle, {
    plate: data.plate,
    type: plateType(data.plate)!,
    brand: data.brand,
    model: data.model,
    year: data.year,
    soatExpiry: data.soatExpiry || undefined,
    rtmExpiry: data.rtmExpiry || undefined,
  });
  upsertAutoReminder(user.id, vehicle, "soat", vehicle.soatExpiry);
  upsertAutoReminder(user.id, vehicle, "tecnomecanica", vehicle.rtmExpiry);
  revalidatePath("/cuenta", "layout");
  return { ok: true };
}

export async function deleteVehicleAction(id: string) {
  const user = await requireUser();
  const d = db();
  const v = d.vehicles.get(id);
  if (!v || v.userId !== user.id) return;
  d.vehicles.delete(id);
  for (const r of d.reminders.values()) if (r.vehicleId === id && r.kind !== "poliza") d.reminders.delete(r.id);
  revalidatePath("/cuenta", "layout");
}

// ── Pólizas externas ───────────────────────────────────────────────────────

const externalPolicySchema = z.object({
  insurerName: z.string().trim().min(2).max(60),
  planName: z.string().trim().min(2).max(80),
  number: z.string().trim().min(3).max(40),
  vehicleId: z.string().min(1),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
});

export async function addExternalPolicyAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = externalPolicySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Completa todos los campos de la póliza." };
  const data = parsed.data;
  if (data.endDate <= data.startDate) return { error: "La fecha de fin debe ser posterior al inicio." };
  const v = db().vehicles.get(data.vehicleId);
  if (!v || v.userId !== user.id) return { error: "Selecciona uno de tus vehículos." };
  const policy: Policy = {
    id: newId(),
    number: data.number,
    source: "externa",
    holderEmail: user.email,
    holderName: user.name ?? user.email,
    insurerId: "externa",
    insurerName: data.insurerName,
    planName: data.planName,
    vehicle: { type: v.type, plate: v.plate, brand: v.brand, model: v.model, year: v.year, commercialValue: 0 },
    startDate: data.startDate,
    endDate: data.endDate,
    accessToken: randomToken(),
  };
  db().policies.set(policy.id, policy);
  attachPolicyToUser(policy, user.id);
  revalidatePath("/cuenta", "layout");
  return { ok: true };
}

export async function deletePolicyAction(id: string) {
  const user = await requireUser();
  const d = db();
  const p = d.policies.get(id);
  if (!p || p.userId !== user.id || p.source !== "externa") return;
  d.policies.delete(id);
  for (const r of d.reminders.values()) if (r.policyId === id) d.reminders.delete(r.id);
  revalidatePath("/cuenta", "layout");
}

// ── Recordatorios ──────────────────────────────────────────────────────────

const reminderSchema = z.object({
  title: z.string().trim().min(3).max(100),
  dueDate: z.iso.date(),
  daysBefore: z.coerce.number().int().min(0).max(90),
  kind: z.enum(["poliza", "soat", "tecnomecanica", "cuota", "otro"]),
});

export async function addReminderAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = reminderSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Revisa el título y la fecha." };
  const r: Reminder = { id: newId(), userId: user.id, auto: false, ...parsed.data };
  db().reminders.set(r.id, r);
  revalidatePath("/cuenta", "layout");
  return { ok: true };
}

export async function deleteReminderAction(id: string) {
  const user = await requireUser();
  const d = db();
  const r = d.reminders.get(id);
  if (r && r.userId === user.id) d.reminders.delete(id);
  revalidatePath("/cuenta", "layout");
}

export async function updateReminderDaysAction(id: string, daysBefore: number) {
  const user = await requireUser();
  const r = db().reminders.get(id);
  if (!r || r.userId !== user.id) return;
  r.daysBefore = Math.max(0, Math.min(90, Math.round(daysBefore)));
  revalidatePath("/cuenta", "layout");
}
