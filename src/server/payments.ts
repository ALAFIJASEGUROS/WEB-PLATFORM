import "server-only";
import { createHash } from "node:crypto";
import type { Order } from "./db";

/** Estado normalizado de una transacción, independiente del proveedor. */
export type PaymentStatus = "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | "PENDING";

export interface PaymentUpdate {
  reference: string;
  transactionId: string;
  status: PaymentStatus;
  amountInCents: number;
  /** Id único del evento, para idempotencia. */
  eventId: string;
}

export interface PaymentProvider {
  id: "simulado" | "wompi";
  createCheckout(order: Order, baseUrl: string): Promise<{ redirectUrl: string }>;
  /** Consulta el estado de una transacción (al volver del checkout). */
  fetchTransaction?(transactionId: string): Promise<PaymentUpdate | null>;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// ── Simulado ───────────────────────────────────────────────────────────────

const simulated: PaymentProvider = {
  id: "simulado",
  async createCheckout(order, baseUrl) {
    return {
      redirectUrl: `${baseUrl}/pago/simulado?ref=${encodeURIComponent(order.reference)}&t=${order.accessToken}`,
    };
  },
};

// ── Wompi ──────────────────────────────────────────────────────────────────
// Web Checkout: https://docs.wompi.co/docs/colombia/widget-checkout-web/
// Firma de integridad: SHA256(referencia + monto en centavos + moneda + secreto).
// Eventos: SHA256(valores de signature.properties + timestamp + secreto de eventos).

interface WompiConfig {
  publicKey: string;
  integritySecret: string;
  eventsSecret: string;
  apiBase: string;
}

export function wompiConfig(): WompiConfig | null {
  const publicKey = process.env.WOMPI_PUBLIC_KEY;
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
  const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
  if (!publicKey || !integritySecret || !eventsSecret) return null;
  const apiBase = publicKey.startsWith("pub_prod_")
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";
  return { publicKey, integritySecret, eventsSecret, apiBase };
}

export function wompiIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
  secret: string,
) {
  return sha256(`${reference}${amountInCents}${currency}${secret}`);
}

function wompiStatus(s: string): PaymentStatus {
  return (["APPROVED", "DECLINED", "VOIDED", "ERROR"].includes(s) ? s : "PENDING") as PaymentStatus;
}

function createWompi(cfg: WompiConfig): PaymentProvider {
  return {
    id: "wompi",
    async createCheckout(order, baseUrl) {
      const currency = "COP";
      const p = order.policyholder;
      const params = new URLSearchParams({
        "public-key": cfg.publicKey,
        currency,
        "amount-in-cents": String(order.amountInCents),
        reference: order.reference,
        "signature:integrity": wompiIntegritySignature(
          order.reference,
          order.amountInCents,
          currency,
          cfg.integritySecret,
        ),
        "redirect-url": `${baseUrl}/pago/resultado?ref=${encodeURIComponent(order.reference)}&t=${order.accessToken}`,
        "customer-data:email": p.email,
        "customer-data:full-name": `${p.firstName} ${p.lastName}`,
        "customer-data:phone-number": p.phone,
        "customer-data:phone-number-prefix": "+57",
        "customer-data:legal-id": p.documentNumber,
        "customer-data:legal-id-type": p.documentType,
      });
      return { redirectUrl: `https://checkout.wompi.co/p/?${params}` };
    },
    async fetchTransaction(id) {
      const res = await fetch(`${cfg.apiBase}/transactions/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      const { data } = await res.json();
      return {
        reference: data.reference,
        transactionId: data.id,
        status: wompiStatus(data.status),
        amountInCents: data.amount_in_cents,
        eventId: `tx:${data.id}:${data.status}`,
      };
    },
  };
}

interface WompiEvent {
  event: string;
  data: { transaction: Record<string, unknown> };
  signature: { properties: string[]; checksum: string };
  timestamp: number;
}

/** Valida la firma de un evento de Wompi y lo normaliza. */
export function parseWompiEvent(body: unknown, eventsSecret: string): PaymentUpdate | null {
  const e = body as WompiEvent;
  if (!e?.signature?.properties || !e.data?.transaction) return null;
  const values = e.signature.properties.map((path) =>
    path.split(".").reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], e.data),
  );
  const expected = sha256(`${values.join("")}${e.timestamp}${eventsSecret}`);
  if (expected.toLowerCase() !== String(e.signature.checksum).toLowerCase()) return null;
  if (e.event !== "transaction.updated") return null;
  const t = e.data.transaction;
  return {
    reference: String(t.reference),
    transactionId: String(t.id),
    status: wompiStatus(String(t.status)),
    amountInCents: Number(t.amount_in_cents),
    eventId: `wompi:${t.id}:${t.status}:${e.timestamp}`,
  };
}

export function paymentProvider(): PaymentProvider {
  const cfg = wompiConfig();
  return cfg ? createWompi(cfg) : simulated;
}
