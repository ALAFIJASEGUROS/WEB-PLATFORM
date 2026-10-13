import "server-only";
import { formatCOP } from "@/domain/labels";
import { generateReferralCode, normalizeReferralCode, REFERRER_REWARD, type ReferralReward } from "@/domain/referrals";
import { db, newId, sendMessage, type Order, type User } from "./db";

export function findUserByReferralCode(raw: string | null | undefined) {
  const code = normalizeReferralCode(raw);
  if (!code) return null;
  return [...db().users.values()].find((u) => u.referralCode === code) ?? null;
}

/** Código del usuario; se crea la primera vez, único entre usuarios. */
export function referralCodeFor(user: User) {
  if (user.referralCode) return user.referralCode;
  let code = generateReferralCode();
  while (findUserByReferralCode(code)) code = generateReferralCode();
  user.referralCode = code;
  return code;
}

/** Valida un código para una compra: debe existir y no ser de quien compra. */
export function resolveReferral(raw: string | null | undefined, buyerEmail?: string) {
  const referrer = findUserByReferralCode(raw);
  if (!referrer) return null;
  if (buyerEmail && referrer.email === buyerEmail.toLowerCase()) return null;
  return { code: referrer.referralCode!, referrerUserId: referrer.id };
}

/** Al aprobarse el pago, quien invitó gana su bono (una vez por orden). */
export function recordReferralReward(order: Order) {
  const d = db();
  if (!order.referral || [...d.referralRewards.values()].some((r) => r.orderId === order.id)) return null;
  const referrer = d.users.get(order.referral.referrerUserId);
  if (!referrer) return null;
  const reward: ReferralReward = {
    id: newId(),
    referrerUserId: referrer.id,
    orderId: order.id,
    orderReference: order.reference,
    buyerFirstName: order.policyholder.firstName,
    amount: REFERRER_REWARD,
    at: new Date().toISOString(),
    status: "ganado",
  };
  d.referralRewards.set(reward.id, reward);
  sendMessage({
    to: referrer.email,
    channel: "email",
    kind: "transaccional",
    subject: `Ganaste ${formatCOP(reward.amount)} por tu invitación`,
    body: `${reward.buyerFirstName} compró su seguro con tu código. Sumamos ${formatCOP(reward.amount)} a tus bonos; los descontamos de tu próxima renovación.`,
  });
  return reward;
}

/** Si la compra se retracta o se reembolsa, el bono se anula. */
export function voidReferralReward(orderId: string) {
  for (const r of db().referralRewards.values()) if (r.orderId === orderId) r.status = "anulado";
}

export function referralSummary(userId: string) {
  const rewards = [...db().referralRewards.values()].filter((r) => r.referrerUserId === userId);
  const earned = rewards.filter((r) => r.status === "ganado");
  return { rewards, purchases: earned.length, balance: earned.reduce((s, r) => s + r.amount, 0) };
}
