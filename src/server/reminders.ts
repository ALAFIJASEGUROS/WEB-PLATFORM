import "server-only";
import { db, sendMessage } from "./db";
import { daysUntil } from "./queries";

/**
 * Ventana de contacto de la Ley 2300 de 2023: lunes a viernes 7:00–19:00 y
 * sábados 8:00–15:00 (hora Colombia). Domingos y festivos no se contacta.
 * Los festivos no se modelan todavía.
 */
export function withinContactHours(now: Date) {
  const co = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
  const day = co.getDay();
  const h = co.getHours() + co.getMinutes() / 60;
  if (day === 0) return false;
  if (day === 6) return h >= 8 && h < 15;
  return h >= 7 && h < 19;
}

/** Envía los recordatorios cuya ventana de aviso ya empezó. Idempotente por día. */
export function dispatchDueReminders(now = new Date()) {
  if (!withinContactHours(now)) return { sent: 0, skipped: "fuera de horario" as const };
  const today = now.toISOString().slice(0, 10);
  const d = db();
  let sent = 0;
  for (const r of d.reminders.values()) {
    const left = daysUntil(r.dueDate, now);
    if (left < 0 || left > r.daysBefore || r.lastSentAt) continue;
    const user = d.users.get(r.userId);
    if (!user) continue;
    const when = left === 0 ? "hoy" : `en ${left} días (${r.dueDate})`;
    if (user.channels.email) {
      sendMessage({ to: user.email, channel: "email", subject: `Recordatorio: ${r.title}`, body: `Vence ${when}. Gestiona tus seguros en SeguAlaFija.` });
      sent++;
    }
    if (user.channels.whatsapp && user.phone) {
      sendMessage({ to: user.phone, channel: "whatsapp", subject: r.title, body: `Hola, te recordamos: ${r.title} vence ${when}.` });
      sent++;
    }
    r.lastSentAt = today;
  }
  return { sent };
}
