import { applyPaymentUpdate } from "@/server/orders";
import { parseWompiEvent, wompiConfig } from "@/server/payments";

// Webhook de eventos de Wompi (transaction.updated). Configurar la URL
// https://<dominio>/api/webhooks/wompi en el panel de Wompi.
export async function POST(request: Request) {
  const cfg = wompiConfig();
  if (!cfg) return Response.json({ error: "Wompi no configurado" }, { status: 503 });
  const update = parseWompiEvent(await request.json().catch(() => null), cfg.eventsSecret);
  if (!update) return Response.json({ error: "Firma inválida" }, { status: 401 });
  await applyPaymentUpdate(update);
  return Response.json({ ok: true });
}
