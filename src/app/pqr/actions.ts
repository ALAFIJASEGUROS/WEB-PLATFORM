"use server";

import { z } from "zod";
import { createPqr } from "@/server/pqr";
import type { FormState } from "../cuenta/actions";

const schema = z.object({
  type: z.enum(["peticion", "queja", "reclamo", "sugerencia"]),
  name: z.string().trim().min(3).max(80),
  email: z.email(),
  policyNumber: z.string().trim().max(40).optional(),
  message: z.string().trim().min(20, "Cuéntanos un poco más (mínimo 20 caracteres).").max(2000),
  dataProcessing: z.literal("on"),
});

export async function createPqrAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const msg = parsed.error.issues.find((i) => i.path[0] === "message")?.message;
    return { error: msg ?? "Revisa los campos y acepta el tratamiento de datos." };
  }
  const { dataProcessing: _consent, policyNumber, ...rest } = parsed.data;
  void _consent;
  const pqr = createPqr({ ...rest, policyNumber: policyNumber || undefined });
  return {
    ok: true,
    message: `Radicamos tu solicitud con el número ${pqr.radicado}. Te responderemos a más tardar el ${pqr.dueDate}.`,
  };
}
