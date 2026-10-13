// Programa de referidos: quien compra puede invitar con su código. La persona
// invitada recibe el descuento de la regla "solo con código de invitación"
// (editable en /admin) y quien invitó gana un bono por cada compra pagada.

export const REFERRAL_PARAM = "ref";
/** Sin letras ni números que se confunden (O/0, I/1). */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const REFERRAL_CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;

/** Bono para quien invita por cada compra pagada con su código (COP). */
export const REFERRER_REWARD = 25_000;

/** Días que se recuerda el código después de abrir el enlace. */
export const REFERRAL_TTL_DAYS = 30;

export function normalizeReferralCode(raw: string | null | undefined) {
  const c = (raw ?? "").trim().toUpperCase();
  return REFERRAL_CODE_RE.test(c) ? c : null;
}

export function generateReferralCode(random: () => number = Math.random) {
  return Array.from({ length: 6 }, () => ALPHABET[Math.floor(random() * ALPHABET.length)]).join("");
}

export const referralLink = (base: string, code: string) => `${base}/?${REFERRAL_PARAM}=${code}`;

export interface ReferralReward {
  id: string;
  referrerUserId: string;
  orderId: string;
  orderReference: string;
  /** Solo el nombre de pila de quien compró, por privacidad. */
  buyerFirstName: string;
  amount: number;
  at: string;
  status: "ganado" | "anulado";
}
