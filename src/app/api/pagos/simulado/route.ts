import { z } from "zod";
import { applyPaymentUpdate, findOrderByReference } from "@/server/orders";
import { paymentProvider } from "@/server/payments";

const schema = z.object({
  reference: z.string(),
  token: z.string(),
  outcome: z.enum(["APPROVED", "DECLINED", "PENDING"]),
});

// Simula la respuesta de la pasarela cuando no hay llaves de Wompi.
export async function POST(request: Request) {
  if (paymentProvider().id !== "simulado") {
    return Response.json({ error: "No disponible" }, { status: 404 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  const { reference, token, outcome } = parsed.data;
  const order = findOrderByReference(reference);
  if (!order || order.accessToken !== token) {
    return Response.json({ error: "Orden no encontrada" }, { status: 404 });
  }
  const txId = `SIM-${crypto.randomUUID().slice(0, 8)}`;
  await applyPaymentUpdate({
    reference,
    transactionId: txId,
    status: outcome,
    amountInCents: order.amountInCents,
    eventId: `sim:${txId}`,
  });
  return Response.json({ ok: true });
}
