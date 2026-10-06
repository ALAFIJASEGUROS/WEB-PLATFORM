import "server-only";
import { addBusinessDays, todayInColombia } from "@/domain/holidays";
import { db, newId, sendMessage, type Pqr, type PqrStatus, type PqrType } from "./db";

/** Plazo de respuesta en días hábiles. */
export const PQR_BUSINESS_DAYS = 15;

export const PQR_TYPE_LABELS: Record<PqrType, string> = {
  peticion: "Petición",
  queja: "Queja",
  reclamo: "Reclamo",
  sugerencia: "Sugerencia",
};

export function createPqr(input: { type: PqrType; name: string; email: string; policyNumber?: string; message: string }) {
  const d = db();
  const today = todayInColombia();
  const pqr: Pqr = {
    id: newId(),
    radicado: `PQR-${today.slice(0, 4)}-${String(d.pqrs.size + 1).padStart(6, "0")}`,
    ...input,
    email: input.email.toLowerCase(),
    createdAt: new Date().toISOString(),
    dueDate: addBusinessDays(today, PQR_BUSINESS_DAYS),
    status: "radicada",
  };
  d.pqrs.set(pqr.id, pqr);
  sendMessage({
    to: pqr.email,
    channel: "email",
    subject: `Recibimos tu ${PQR_TYPE_LABELS[pqr.type].toLowerCase()} · radicado ${pqr.radicado}`,
    body: `Hola ${pqr.name}, radicamos tu solicitud con el número ${pqr.radicado}. Te responderemos a más tardar el ${pqr.dueDate}.`,
  });
  return pqr;
}

export function updatePqr(id: string, status: PqrStatus, response?: string) {
  const pqr = db().pqrs.get(id);
  if (!pqr) return null;
  pqr.status = status;
  if (status === "respondida" && response) {
    pqr.response = response;
    pqr.respondedAt = new Date().toISOString();
    sendMessage({
      to: pqr.email,
      channel: "email",
      subject: `Respuesta a tu solicitud ${pqr.radicado}`,
      body: response,
    });
  }
  return pqr;
}
