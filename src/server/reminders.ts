import "server-only";
import { isHoliday, todayInColombia } from "@/domain/holidays";
import { db, sendMessage, type Installment, type Policy, type Reminder } from "./db";
import { daysUntil, overdueInstallment } from "./queries";
import { renewalSuggestions } from "./renewals";
import { formatCOP } from "@/domain/labels";
import { channelFor } from "@/domain/messaging";

/**
 * Ventana de contacto de la Ley 2300 de 2023: lunes a viernes 7:00–19:00 y
 * sábados 8:00–15:00 (hora Colombia). Domingos y festivos no se contacta.
 */
export function withinContactHours(now: Date) {
  const co = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
  const day = co.getDay();
  const h = co.getHours() + co.getMinutes() / 60;
  if (day === 0 || isHoliday(todayInColombia(now))) return false;
  if (day === 6) return h >= 8 && h < 15;
  return h >= 7 && h < 19;
}

const g = globalThis as unknown as { __safLastContact?: Map<string, string> };
/** Último día (hora Colombia) en que se contactó a cada usuario. */
const lastContact = () => (g.__safLastContact ??= new Map());

/**
 * Envía los recordatorios cuya ventana de aviso ya empezó. Respeta la Ley 2300:
 * a cada persona se le escribe como máximo una vez al día y por un solo canal
 * (WhatsApp si lo autorizó, si no correo), agrupando todos sus avisos.
 */
export async function dispatchDueReminders(now = new Date()) {
  if (!withinContactHours(now)) return { sent: 0, skipped: "fuera de horario" as const };
  const today = todayInColombia(now);
  const d = db();
  const byUser = new Map<string, Reminder[]>();
  for (const r of d.reminders.values()) {
    const left = daysUntil(r.dueDate, now);
    if (left < 0 || left > r.daysBefore || r.lastSentAt) continue;
    byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r]);
  }
  // Cuotas vencidas: un aviso por cuota explicando que la mora termina el contrato.
  const overdueByUser = new Map<string, { policy: Policy; inst: Installment }[]>();
  for (const policy of d.policies.values()) {
    const inst = policy.userId ? overdueInstallment(policy, now) : undefined;
    if (!inst || inst.moraNotifiedAt) continue;
    overdueByUser.set(policy.userId!, [...(overdueByUser.get(policy.userId!) ?? []), { policy, inst }]);
    if (!byUser.has(policy.userId!)) byUser.set(policy.userId!, []);
  }

  let sent = 0;
  for (const [userId, due] of byUser) {
    const user = d.users.get(userId);
    if (!user || lastContact().get(userId) === today) continue;
    // Preferencias: los vencimientos pueden apagarse; la mora es transaccional y siempre se avisa.
    const hasPhone = !!user.phone;
    const overdue = overdueByUser.get(userId) ?? [];
    const dueChannel = channelFor(user.preferences, "vencimientos", hasPhone);
    const sendable = dueChannel ? due : [];
    if (!overdue.length && !sendable.length) continue;
    const channel = overdue.length ? channelFor(user.preferences, "transaccional", hasPhone)! : dueChannel!;
    const moraLines = overdue.map(
      ({ policy, inst }) =>
        `⚠ La cuota ${inst.n} de ${policy.planName} (${formatCOP(inst.amount)}) venció el ${inst.dueDate}. Si no la pagas, el seguro puede terminar por mora (art. 1068 del Código de Comercio) y quedarías sin cobertura; pagar después no lo reactiva.`,
    );
    const lines = sendable.map((r) => {
      const left = daysUntil(r.dueDate, now);
      return `• ${r.title}: vence ${left === 0 ? "hoy" : `en ${left} días (${r.dueDate})`}`;
    });
    // Si alguna póliza por renovar tiene una opción mejor, se menciona en el mismo mensaje.
    const renewing = new Set(sendable.filter((r) => r.kind === "poliza").map((r) => r.policyId));
    if (renewing.size && channelFor(user.preferences, "renovacion", hasPhone)) {
      for (const s of await renewalSuggestions(userId, now)) {
        if (renewing.has(s.policy.id)) {
          lines.push(`  ↳ Encontramos ${s.offer.planName} de ${s.offer.insurerName} con la misma cobertura y ${formatCOP(s.savings)} menos al año.`);
        }
      }
    }
    sendMessage({
      to: channel === "whatsapp" ? user.phone! : user.email,
      channel,
      kind: moraLines.length ? "transaccional" : "vencimientos",
      subject: moraLines.length
        ? "Tienes una cuota vencida: evita perder tu cobertura"
        : sendable.length === 1 ? `Recordatorio: ${sendable[0].title}` : `Tienes ${sendable.length} vencimientos próximos`,
      body: `${[...moraLines, ...lines].join("\n")}\n\nGestiona tus seguros en SeguAlaFija.`,
    });
    sendable.forEach((r) => (r.lastSentAt = today));
    overdue.forEach(({ inst }) => (inst.moraNotifiedAt = today));
    lastContact().set(userId, today);
    sent++;
  }
  return { sent };
}
