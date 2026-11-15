"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/server/admin";
import { insurerCampaignSchema, insurerSession, proposeCampaign, toggleInsurerCampaign } from "@/server/insurer-portal";
import type { FormState } from "../cuenta/actions";

/** La aseguradora propone una campaña: queda en revisión de SeguAlaFija. */
export async function proposeCampaignAction(_: FormState, form: FormData): Promise<FormState> {
  const s = await insurerSession();
  if (!s) return { error: "Tu sesión no tiene acceso al portal de aseguradoras." };
  const parsed = insurerCampaignSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los campos de la campaña." };
  const c = proposeCampaign(s.insurerId, s.insurerName, parsed.data);
  audit(s.user.email, "Aseguradora propuso campaña", `${s.insurerName}: ${c.title}`);
  revalidatePath("/aliados");
  revalidatePath("/admin");
  return { ok: true, message: "Enviamos tu campaña a revisión. Te avisaremos cuando esté publicada." };
}

export async function toggleCampaignAction(campaignId: string) {
  const s = await insurerSession();
  if (!s) return;
  const c = toggleInsurerCampaign(s.insurerId, campaignId);
  if (c) audit(s.user.email, c.active ? "Aseguradora reanudó campaña" : "Aseguradora pausó campaña", c.title);
  revalidatePath("/aliados");
}
