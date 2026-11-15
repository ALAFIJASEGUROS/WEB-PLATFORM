"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { companyProgramSchema, parseEmployeeList } from "@/domain/companies";
import { closeEnrollment, CompanyError, decideMemberships, inviteEmployees, retireMember, updateProgram } from "@/server/companies";
import { companyAdminSession } from "@/server/company-admin";
import type { FormState } from "../../../cuenta/actions";

const MAX_CSV_BYTES = 200 * 1024;

async function adminOrError(slug: string) {
  const s = await companyAdminSession(slug, "admin");
  return s ?? null;
}

const decisionSchema = z.object({
  decision: z.enum(["aprobar", "rechazar"]),
  reason: z.string().trim().max(200).optional(),
});

/** Aprueba o rechaza las vinculaciones marcadas (una o varias). */
export async function decideAction(slug: string, _: FormState, form: FormData): Promise<FormState> {
  const s = await adminOrError(slug);
  if (!s) return { error: "No tienes permiso para aprobar." };
  const ids = form.getAll("ids").map(String).slice(0, 500);
  const parsed = decisionSchema.safeParse({ decision: form.get("decision"), reason: form.get("reason") || undefined });
  if (!parsed.success) return { error: "Elige aprobar o rechazar." };
  if (ids.length === 0) return { error: "Marca al menos una persona." };
  const n = decideMemberships(s.company, ids, parsed.data.decision, s.user.email, parsed.data.reason);
  revalidatePath(`/empresas/${slug}/admin`);
  return { ok: true, message: `${n} ${n === 1 ? "vinculación" : "vinculaciones"} ${parsed.data.decision === "aprobar" ? "aprobada" : "rechazada"}${n === 1 ? "" : "s"}.` };
}

/** Invita empleados desde una lista pegada o un archivo CSV. */
export async function inviteAction(slug: string, _: FormState, form: FormData): Promise<FormState> {
  const s = await adminOrError(slug);
  if (!s) return { error: "No tienes permiso para invitar." };
  const file = form.get("file");
  let text = String(form.get("list") ?? "");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_CSV_BYTES) return { error: "El archivo pesa más de 200 KB." };
    text = `${text}\n${await file.text()}`;
  }
  const list = parseEmployeeList(text);
  if (list.valid.length === 0) return { error: "No encontramos correos válidos. Usa una persona por línea: nombre, correo." };
  const { created, skipped } = inviteEmployees(s.company, list.valid, s.user.email);
  revalidatePath(`/empresas/${slug}/admin`);
  const notes = [
    skipped.length && `${skipped.length} ya estaban en la empresa`,
    list.duplicates.length && `${list.duplicates.length} repetidos en la lista`,
    list.invalid.length && `${list.invalid.length} líneas sin correo válido`,
    list.tooMany && "solo se tomaron las primeras 1.000",
  ].filter(Boolean);
  return { ok: true, message: `Enviamos ${created} ${created === 1 ? "invitación" : "invitaciones"}.${notes.length ? ` ${notes.join(", ")}.` : ""}` };
}

/** Planes habilitados, quién paga y cierre de la inscripción. */
export async function programAction(slug: string, _: FormState, form: FormData): Promise<FormState> {
  const s = await adminOrError(slug);
  if (!s) return { error: "No tienes permiso para cambiar el programa." };
  const parsed = companyProgramSchema.safeParse({
    paymentModel: form.get("paymentModel"),
    copayAmount: form.get("copayAmount") ?? "",
    allowedPlanCodes: form.getAll("plans").map(String),
    enrollmentClosesAt: form.get("enrollmentClosesAt") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  updateProgram(s.company, parsed.data, s.user.email);
  revalidatePath(`/empresas/${slug}/admin`);
  revalidatePath(`/empresas/${slug}`);
  return { ok: true, message: "Programa actualizado." };
}

/** Cierra la inscripción ahora (sin esperar al cron): fija el tramo y los precios finales. */
export async function closeEnrollmentAction(slug: string): Promise<FormState> {
  const s = await adminOrError(slug);
  if (!s) return { error: "No tienes permiso para cerrar la inscripción." };
  try {
    const r = await closeEnrollment(s.company, s.user.email);
    revalidatePath(`/empresas/${slug}/admin`);
    revalidatePath(`/empresas/${slug}`);
    return {
      ok: true,
      message: `Inscripción cerrada con ${r.enrolled} inscritos${r.discountPct ? ` y ${r.discountPct} % de descuento` : ""}. Avisamos a ${r.priced} ${r.priced === 1 ? "persona" : "personas"} su precio final.`,
    };
  } catch (e) {
    if (e instanceof CompanyError) return { error: e.message };
    throw e;
  }
}

/** Retira a un empleado: su póliza sigue hasta el vencimiento. */
export async function retireAction(slug: string, membershipId: string) {
  const s = await adminOrError(slug);
  if (!s) return;
  retireMember(s.company, membershipId, s.user.email);
  revalidatePath(`/empresas/${slug}/admin`);
}
