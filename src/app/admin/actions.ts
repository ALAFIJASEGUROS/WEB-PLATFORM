"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminLogin, isAdmin } from "@/server/admin";
import { db, newId } from "@/server/db";
import { dispatchDueReminders } from "@/server/reminders";
import type { FormState } from "../cuenta/actions";

async function guard() {
  if (!(await isAdmin())) throw new Error("No autorizado");
}

export async function adminLoginAction(_: FormState, form: FormData): Promise<FormState> {
  const ok = await adminLogin(String(form.get("password") ?? ""));
  if (!ok) return { error: "Contraseña incorrecta." };
  redirect("/admin");
}

const campaignSchema = z.object({
  sponsor: z.string().trim().min(2).max(60),
  title: z.string().trim().min(3).max(100),
  body: z.string().trim().min(10).max(400),
  ctaLabel: z.string().trim().min(2).max(30),
  ctaUrl: z.string().trim().refine((u) => u.startsWith("/") || u.startsWith("https://"), "URL inválida"),
  audience: z.enum(["auto", "moto", "todos"]),
});

export async function createCampaignAction(_: FormState, form: FormData): Promise<FormState> {
  await guard();
  const parsed = campaignSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Revisa los campos de la campaña (URL debe iniciar por / o https://)." };
  const id = newId();
  db().campaigns.set(id, { id, ...parsed.data, active: true, createdAt: new Date().toISOString() });
  revalidatePath("/admin");
  return { ok: true };
}

export async function toggleCampaignAction(id: string) {
  await guard();
  const c = db().campaigns.get(id);
  if (c) c.active = !c.active;
  revalidatePath("/admin");
}

export async function runRemindersAction() {
  await guard();
  // En el panel se fuerza el envío ignorando el horario, solo para demostración.
  const noon = new Date();
  noon.setUTCHours(17, 0, 0, 0);
  if (noon.getUTCDay() === 0) noon.setUTCDate(noon.getUTCDate() + 1);
  dispatchDueReminders(noon);
  revalidatePath("/admin");
}
