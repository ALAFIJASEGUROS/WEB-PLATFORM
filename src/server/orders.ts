import "server-only";
import type { CheckoutInput } from "@/domain/schemas";
import { formatCOP } from "@/domain/labels";
import { getAdapter } from "@/insurers/aggregator";
import {
  attachPolicyToUser,
  db,
  findUserByEmail,
  newId,
  randomToken,
  sendMessage,
  syncInstallmentReminder,
  type Installment,
  type Order,
  type Policy,
} from "./db";
import { paymentProvider, type PaymentUpdate } from "./payments";
import { recordEvent } from "./analytics";

export class CheckoutError extends Error {}

/**
 * Crea la orden volviendo a cotizar en el servidor: el precio nunca se toma
 * del cliente.
 */
export async function createOrder(input: CheckoutInput, userId?: string) {
  const [insurerId] = input.offerId.split(":");
  const adapter = getAdapter(insurerId);
  if (!adapter) throw new CheckoutError("Aseguradora no disponible.");
  let offers;
  try {
    offers = await adapter.quote(input.quote, AbortSignal.timeout(8000));
  } catch {
    throw new CheckoutError(`${adapter.name} no respondió. Intenta de nuevo.`);
  }
  const offer = offers.find((o) => o.id === input.offerId);
  if (!offer) throw new CheckoutError("La oferta ya no está disponible. Cotiza de nuevo.");

  const amount =
    input.paymentPlan === "anual" ? offer.annualPremium : offer.monthlyPremium;
  const order: Order = {
    id: newId(),
    reference: `SAF-${Date.now().toString(36).toUpperCase()}-${randomToken(3).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    status: "pendiente",
    quote: input.quote,
    offer,
    paymentPlan: input.paymentPlan,
    amountInCents: amount * 100,
    policyholder: { ...input.policyholder, email: input.policyholder.email.toLowerCase() },
    consents: input.consents,
    provider: paymentProvider().id,
    accessToken: randomToken(),
    userId,
    analyticsSid: input.analyticsSid,
  };
  db().orders.set(order.id, order);
  return order;
}

export function findOrderByReference(reference: string) {
  return [...db().orders.values()].find((o) => o.reference === reference);
}

/** Acceso a una orden con el token del enlace (compras sin cuenta) o el dueño. */
export function getOrderForViewer(reference: string, token?: string, userId?: string) {
  const o = findOrderByReference(reference);
  if (!o) return null;
  if ((token && token === o.accessToken) || (userId && o.userId === userId)) return o;
  return null;
}

/**
 * Aplica el resultado de un pago. Es idempotente: el mismo evento puede llegar
 * por webhook y por la redirección del checkout.
 */
export async function applyPaymentUpdate(u: PaymentUpdate) {
  const d = db();
  if (d.processedEvents.has(u.eventId)) return findOrderByReference(u.reference);
  const installment = d.installmentPayments.get(u.reference);
  if (installment) {
    d.processedEvents.add(u.eventId);
    if (u.status === "APPROVED" && u.amountInCents === installment.amountInCents) {
      markInstallmentPaid(installment.policyId, installment.n);
    }
    return null;
  }
  const order = findOrderByReference(u.reference);
  if (!order) return null;
  d.processedEvents.add(u.eventId);

  if (order.status === "emitida" || order.status === "aprobada") return order;
  order.providerTransactionId = u.transactionId;

  if (u.status === "APPROVED") {
    if (u.amountInCents !== order.amountInCents) {
      order.status = "error";
      console.error(`[pagos] monto no coincide para ${order.reference}`);
      return order;
    }
    order.status = "aprobada";
    if (order.analyticsSid) recordEvent("pago_aprobado", order.analyticsSid, { aseguradora: order.offer.insurerId, plan: order.paymentPlan });
    await issuePolicy(order);
  } else if (u.status === "PENDING") {
    order.status = "pendiente";
  } else {
    order.status = "rechazada";
  }
  return order;
}

function addMonths(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

/** 12 cuotas mensuales; la primera se paga al comprar. */
export function buildInstallments(startDate: string, amount: number): Installment[] {
  return Array.from({ length: 12 }, (_, i) => ({
    n: i + 1,
    dueDate: addMonths(startDate, i),
    amount,
    status: i === 0 ? "pagada" : "pendiente",
    paidAt: i === 0 ? new Date().toISOString() : undefined,
  }));
}

function addYears(iso: string, n: number) {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + n);
  return d.toISOString().slice(0, 10);
}

async function issuePolicy(order: Order) {
  const adapter = getAdapter(order.offer.insurerId);
  if (!adapter) return;
  const h = order.policyholder;
  const startDate = new Date().toISOString().slice(0, 10);
  try {
    const { policyNumber } = await adapter.issue({
      offer: order.offer,
      quote: order.quote,
      holder: {
        documentType: h.documentType,
        documentNumber: h.documentNumber,
        fullName: `${h.firstName} ${h.lastName}`,
      },
      startDate,
    });
    const policy: Policy = {
      id: newId(),
      number: policyNumber,
      source: "compra",
      orderId: order.id,
      holderEmail: h.email,
      holderName: `${h.firstName} ${h.lastName}`,
      insurerId: order.offer.insurerId,
      insurerName: order.offer.insurerName,
      planName: order.offer.planName,
      vehicle: order.quote.vehicle,
      startDate,
      endDate: addYears(startDate, 1),
      annualPremium: order.offer.annualPremium,
      paymentPlan: order.paymentPlan,
      installments:
        order.paymentPlan === "mensual"
          ? buildInstallments(startDate, order.amountInCents / 100)
          : undefined,
      accessToken: order.accessToken,
    };
    db().policies.set(policy.id, policy);
    order.policyId = policy.id;
    order.status = "emitida";

    const owner = order.userId ?? findUserByEmail(h.email)?.id;
    if (owner) {
      order.userId = owner;
      attachPolicyToUser(policy, owner);
    }

    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    sendMessage({
      to: h.email,
      channel: "email",
      subject: `Tu póliza ${policy.number} está activa`,
      body: [
        `Hola ${h.firstName},`,
        `Tu seguro ${policy.planName} de ${policy.insurerName} para ${policy.vehicle.brand} ${policy.vehicle.model} quedó activo desde el ${policy.startDate} hasta el ${policy.endDate}.`,
        `Pagaste ${formatCOP(order.amountInCents / 100)} (${order.paymentPlan === "anual" ? "pago anual" : "primera cuota mensual"}).`,
        `Ver tu póliza: ${base}/poliza/${policy.id}?t=${policy.accessToken}`,
        `Crea tu cuenta con este correo para recibir recordatorios de renovación, SOAT y tecnomecánica: ${base}/cuenta`,
      ].join("\n\n"),
    });
  } catch (e) {
    order.status = "error";
    console.error("[emisión] falló", e);
  }
}

export function getPolicyForViewer(id: string, token?: string, userId?: string) {
  const p = db().policies.get(id);
  if (!p) return null;
  if ((token && token === p.accessToken) || (userId && p.userId === userId)) return p;
  return null;
}

export function markInstallmentPaid(policyId: string, n: number) {
  const p = db().policies.get(policyId);
  const inst = p?.installments?.find((i) => i.n === n);
  if (!p || !inst || inst.status === "pagada") return;
  inst.status = "pagada";
  inst.paidAt = new Date().toISOString();
  syncInstallmentReminder(p);
  sendMessage({
    to: p.holderEmail,
    channel: "email",
    subject: `Recibimos el pago de la cuota ${n} de ${p.installments!.length}`,
    body: `Pagaste ${formatCOP(inst.amount)} de tu póliza ${p.number} (${p.planName}).`,
  });
}

/**
 * Inicia el pago de la próxima cuota pendiente. Con la pasarela simulada se
 * aprueba de inmediato; con Wompi se redirige al checkout y el webhook la marca.
 */
export async function startInstallmentPayment(policyId: string, userId: string, baseUrl: string) {
  const p = db().policies.get(policyId);
  if (!p || p.userId !== userId) throw new CheckoutError("Póliza no encontrada.");
  const next = p.installments?.find((i) => i.status === "pendiente");
  if (!next) throw new CheckoutError("No tienes cuotas pendientes.");
  const provider = paymentProvider();
  if (provider.id === "simulado") {
    markInstallmentPaid(p.id, next.n);
    return { redirectUrl: `/cuenta/seguros?cuota=${next.n}` };
  }
  const order = p.orderId ? db().orders.get(p.orderId) : undefined;
  if (!order) throw new CheckoutError("No encontramos la compra original.");
  const reference = `${order.reference}-C${next.n}-${randomToken(2).toUpperCase()}`;
  const amountInCents = next.amount * 100;
  db().installmentPayments.set(reference, { reference, policyId: p.id, n: next.n, amountInCents });
  return provider.createCheckout({ ...order, reference, amountInCents }, baseUrl);
}
