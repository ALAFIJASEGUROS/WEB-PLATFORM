"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth";
import { CheckoutError, retractPolicy } from "@/server/orders";
import type { FormState } from "../cuenta/actions";

export async function retractAction(_: FormState, form: FormData): Promise<FormState> {
  if (form.get("confirm") !== "on") return { error: "Confirma que quieres retractarte." };
  const user = await getCurrentUser();
  try {
    retractPolicy(String(form.get("policyId")), {
      token: String(form.get("token") ?? "") || undefined,
      userId: user?.id,
    });
  } catch (e) {
    if (e instanceof CheckoutError) return { error: e.message };
    throw e;
  }
  revalidatePath("/poliza/[id]", "page");
  revalidatePath("/cuenta", "layout");
  return { ok: true };
}
