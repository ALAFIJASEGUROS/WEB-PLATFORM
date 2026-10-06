import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "saf_admin";

/** Sin ADMIN_PASSWORD el panel solo funciona fuera de producción (demo). */
export function adminOpenWithoutPassword() {
  return !process.env.ADMIN_PASSWORD && process.env.NODE_ENV !== "production";
}

function token() {
  return createHmac("sha256", process.env.ADMIN_PASSWORD ?? "")
    .update("saf-admin")
    .digest("base64url");
}

export async function isAdmin() {
  // Leer cookies siempre hace que el panel se renderice por solicitud.
  const v = (await cookies()).get(COOKIE)?.value ?? "";
  if (adminOpenWithoutPassword()) return true;
  if (!process.env.ADMIN_PASSWORD) return false;
  const t = token();
  return v.length === t.length && timingSafeEqual(Buffer.from(v), Buffer.from(t));
}

export async function adminLogin(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  (await cookies()).set(COOKIE, token(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 60 * 60 * 8,
  });
  return true;
}
