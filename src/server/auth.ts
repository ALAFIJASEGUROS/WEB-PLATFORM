import "server-only";
import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { claimGuestPurchases, db, getOrCreateUser, sendMessage } from "./db";

const COOKIE = "saf_session";
const SESSION_DAYS = 30;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true") {
    throw new Error("SESSION_SECRET no está configurado");
  }
  return "dev-only-secret-change-me";
}

const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");
const hashCode = (email: string, code: string) =>
  createHash("sha256").update(`${email}:${code}:${secret()}`).digest("hex");

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Mientras no haya proveedor de correo real, el código se muestra en pantalla. */
export const otpShownOnScreen = () => !process.env.RESEND_API_KEY;

export async function requestOtp(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  db().otps.set(email, {
    email,
    codeHash: hashCode(email, code),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });
  sendMessage({
    to: email,
    channel: "email",
    subject: "Tu código de acceso a SeguAlaFija",
    body: `Tu código es ${code}. Vence en 10 minutos. Si no lo pediste, ignora este mensaje.`,
  });
  return { demoCode: otpShownOnScreen() ? code : undefined };
}

export async function verifyOtp(rawEmail: string, code: string) {
  const email = rawEmail.trim().toLowerCase();
  const otp = db().otps.get(email);
  if (!otp || otp.expiresAt < Date.now()) return { ok: false as const, error: "El código venció. Pide uno nuevo." };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return { ok: false as const, error: "Demasiados intentos. Pide un código nuevo." };
  otp.attempts++;
  if (!safeEqual(otp.codeHash, hashCode(email, code.trim()))) {
    return { ok: false as const, error: "Código incorrecto." };
  }
  db().otps.delete(email);
  const user = getOrCreateUser(email);
  claimGuestPurchases(user);

  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const payload = `${user.id}.${exp}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(exp),
  });
  return { ok: true as const, user };
}

export async function logout() {
  (await cookies()).delete(COOKIE);
}

export async function getCurrentUser() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [id, exp, sig] = raw.split(".");
  if (!id || !exp || !sig) return null;
  if (!safeEqual(sig, sign(`${id}.${exp}`)) || Number(exp) < Date.now()) return null;
  return db().users.get(id) ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autorizado");
  return user;
}

export async function baseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
