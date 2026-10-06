import "server-only";
import { db, type Campaign, type User } from "./db";

export function userPolicies(userId: string) {
  return [...db().policies.values()]
    .filter((p) => p.userId === userId)
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
}

export function userVehicles(userId: string) {
  return [...db().vehicles.values()].filter((v) => v.userId === userId);
}

export function userReminders(userId: string) {
  return [...db().reminders.values()]
    .filter((r) => r.userId === userId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Campañas visibles para el usuario: requiere consentimiento de marketing. */
export function campaignsFor(user: User): Campaign[] {
  if (!user.marketingConsent) return [];
  const types = new Set(userVehicles(user.id).map((v) => v.type));
  return [...db().campaigns.values()].filter(
    (c) => c.active && (c.audience === "todos" || types.size === 0 || types.has(c.audience)),
  );
}

export function daysUntil(iso: string, from = new Date()) {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - a) / 86_400_000);
}
