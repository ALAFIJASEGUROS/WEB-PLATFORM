import "server-only";
import { consentRecord } from "@/domain/consents";
import { LEAD_STATUS_LABELS, TIME_SLOTS, type Lead, type LeadStatus } from "@/domain/leads";
import type { z } from "zod";
import type { leadInputSchema } from "@/domain/leads";
import type { QuoteRequest } from "@/domain/types";
import { encodeShare } from "@/lib/share";
import { db, newId, sendMessage, type SavedQuote } from "./db";
import { audit } from "./admin";

type Ctx = { ip?: string; userAgent?: string };

export function createLead(input: z.output<typeof leadInputSchema>, ctx: Ctx = {}): Lead {
  const { contactConsent: _c, email, ...rest } = input;
  void _c;
  const lead: Lead = {
    id: newId(),
    ...rest,
    ...(email && { email: email.toLowerCase() }),
    createdAt: new Date().toISOString(),
    status: "nueva",
    consent: consentRecord("contact", true, input.kind === "flota" ? "flotas" : "resultados", ctx),
    history: [],
  };
  db().leads.set(lead.id, lead);
  if (lead.email) {
    sendMessage({
      to: lead.email,
      channel: "email",
      kind: "transaccional",
      subject: input.kind === "flota" ? "Recibimos tu solicitud para tu flota" : "Te llamaremos pronto",
      body: `Hola ${lead.name}, un asesor te contactará al ${lead.phone} en el horario que elegiste (${TIME_SLOTS[lead.slot]}).`,
    });
  }
  return lead;
}

export function updateLead(id: string, actor: string, status: LeadStatus, note?: string) {
  const lead = db().leads.get(id);
  if (!lead) return null;
  lead.status = status;
  if (note) lead.notes = note;
  lead.history.push({ at: new Date().toISOString(), by: actor, status, ...(note && { note }) });
  audit(actor, "Actualizó oportunidad", `${lead.name} → ${LEAD_STATUS_LABELS[status]}`);
  return lead;
}

export function saveQuote(email: string, request: QuoteRequest, base: string, best: string | undefined, ctx: Ctx = {}): SavedQuote {
  const e = email.toLowerCase();
  const link = `${base}/resultados?c=${encodeShare(request)}`;
  const saved: SavedQuote = {
    id: newId(),
    email: e,
    request,
    link,
    createdAt: new Date().toISOString(),
    consent: consentRecord("savedQuote", true, "resultados", ctx),
  };
  db().savedQuotes.set(saved.id, saved);
  const v = request.vehicle;
  sendMessage({
    to: e,
    channel: "email",
    kind: "transaccional",
    subject: `Tu cotización para tu ${v.brand} ${v.model}`,
    body: `Aquí tienes tu cotización para retomarla cuando quieras${best ? ` (la recomendada: ${best})` : ""}:\n${link}\n\nLos precios se recalculan al abrirla.`,
  });
  return saved;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Un único recordatorio, 24 horas después, si con ese correo no se ha hecho
 * ninguna compra desde que se guardó. Lo llama el envío de recordatorios, que
 * ya respeta el horario de la Ley 2300.
 */
export function dueSavedQuoteReminders(now = new Date()) {
  const d = db();
  const due: SavedQuote[] = [];
  for (const q of d.savedQuotes.values()) {
    if (q.reminderSentAt || now.getTime() - Date.parse(q.createdAt) < DAY) continue;
    const bought = [...d.orders.values()].some(
      (o) => o.policyholder.email.toLowerCase() === q.email && o.createdAt >= q.createdAt && (o.status === "aprobada" || o.status === "emitida"),
    );
    if (!bought) due.push(q);
  }
  return due;
}

export function sendSavedQuoteReminder(q: SavedQuote, today: string) {
  const v = q.request.vehicle;
  sendMessage({
    to: q.email,
    channel: "email",
    kind: "vencimientos",
    subject: `¿Seguimos con el seguro de tu ${v.brand} ${v.model}?`,
    body: `Guardaste tu cotización ayer. Puedes retomarla aquí:\n${q.link}\n\nSi prefieres que te llamemos, pídelo desde la misma página.`,
  });
  q.reminderSentAt = today;
}
