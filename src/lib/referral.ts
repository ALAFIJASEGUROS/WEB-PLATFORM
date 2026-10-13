"use client";

import { normalizeReferralCode, REFERRAL_PARAM, REFERRAL_TTL_DAYS } from "@/domain/referrals";

const KEY = "saf:ref";

/** Código de invitación vigente guardado en este navegador, si lo hay. */
export function currentReferral(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { code, at } = JSON.parse(raw) as { code: string; at: number };
    if (Date.now() - at > REFERRAL_TTL_DAYS * 86_400_000) {
      localStorage.removeItem(KEY);
      return null;
    }
    return normalizeReferralCode(code);
  } catch {
    return null;
  }
}

/** Lee ?ref= de la URL; si es válido lo guarda. Devuelve el código si es nuevo. */
export function captureReferral(): string | null {
  const params = new URLSearchParams(window.location.search);
  const code = normalizeReferralCode(params.get(REFERRAL_PARAM));
  if (!code) return null;
  const isNew = currentReferral() !== code;
  try {
    localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    /* almacenamiento no disponible */
  }
  // Se limpia la URL para que no se comparta el código por accidente.
  params.delete(REFERRAL_PARAM);
  const qs = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
  return isNew ? code : null;
}
