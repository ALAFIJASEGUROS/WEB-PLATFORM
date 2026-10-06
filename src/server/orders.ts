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
  type Order,
  type Policy,
} from "./db";
import { paymentProvider, type PaymentUpdate } from "./payments";

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
    await issuePolicy(order);
  } else if (u.status === "PENDING") {
    order.status = "pendiente";
  } else {
    order.status = "rechazada";
  }
  return order;
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
