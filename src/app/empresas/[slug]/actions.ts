"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth";
import { CompanyError, findCompanyBySlug, joinCompany } from "@/server/companies";
import type { FormState } from "../../cuenta/actions";

/** El empleado se vincula a su empresa con su correo corporativo o con el código. */
export async function joinCompanyAction(slug: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Entra con tu correo para vincularte." };
  const company = findCompanyBySlug(slug);
  if (!company) return { error: "La empresa no existe." };
  try {
    joinCompany(company, user, String(form.get("code") ?? "").trim() || undefined);
  } catch (e) {
    if (e instanceof CompanyError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/empresas/${slug}`);
  return { ok: true, message: "Listo. Ya puedes cotizar con la tarifa de tu empresa." };
}
