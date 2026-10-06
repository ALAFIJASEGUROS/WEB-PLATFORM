import "server-only";
import { getCurrentUser } from "./auth";
import { newId } from "./db";

// Acceso al panel: la persona entra con su código por correo y su email debe
// estar en ADMIN_EMAILS ("ana@x.com:admin,luis@x.com:analista").
// admin: puede hacer cambios. analista: solo lectura.

export type AdminRole = "admin" | "analista";
export interface AdminSession {
  email: string;
  role: AdminRole;
}

export function adminRoles(env = process.env.ADMIN_EMAILS ?? ""): Map<string, AdminRole> {
  const roles = new Map<string, AdminRole>();
  for (const entry of env.split(",")) {
    const [email, role] = entry.trim().toLowerCase().split(":");
    if (email && (role === "admin" || role === "analista")) roles.set(email, role);
  }
  return roles;
}

/** Sin ADMIN_EMAILS el panel solo abre fuera de producción (demo). */
export function adminOpenForDemo() {
  return adminRoles().size === 0 && process.env.NODE_ENV !== "production";
}

export async function adminSession(): Promise<AdminSession | null> {
  const user = await getCurrentUser();
  if (adminOpenForDemo()) return { email: user?.email ?? "demo", role: "admin" };
  if (!user) return null;
  const role = adminRoles().get(user.email);
  return role ? { email: user.email, role } : null;
}

export async function requireAdmin(role: AdminRole = "admin") {
  const s = await adminSession();
  if (!s || (role === "admin" && s.role !== "admin")) throw new Error("No autorizado");
  return s;
}

// ── Bitácora de auditoría ──────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
}

const g = globalThis as unknown as { __safAudit?: AuditEntry[] };
export const auditLog = () => (g.__safAudit ??= []);

export function audit(actor: string, action: string, detail = "") {
  auditLog().unshift({ id: newId(), at: new Date().toISOString(), actor, action, detail });
  if (auditLog().length > 1000) auditLog().length = 1000;
}
