"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, requireAdmin } from "@/server/admin";
import { db, newId } from "@/server/db";
import { dispatchDueReminders } from "@/server/reminders";
import { updatePqr } from "@/server/pqr";
import type { FormState } from "../cuenta/actions";

const campaignSchema = z.object({
  sponsor: z.string().trim().min(2).max(60),
  title: z.string().trim().min(3).max(100),
  body: z.string().trim().min(10).max(400),
  ctaLabel: z.string().trim().min(2).max(30),
  ctaUrl: z.string().trim().refine((u) => u.startsWith("/") || u.startsWith("https://"), "URL inválida"),
  audience: z.enum(["auto", "moto", "todos"]),
});

export async function createCampaignAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = campaignSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Revisa los campos de la campaña (URL debe iniciar por / o https://)." };
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
