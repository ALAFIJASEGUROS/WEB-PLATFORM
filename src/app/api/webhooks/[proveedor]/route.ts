import { applyPaymentUpdate } from "@/server/orders";
import { providerById } from "@/server/payments";

// Webhook genérico de pasarelas: /api/webhooks/<id>. Cada adaptador valida su
// propia firma en `parseWebhook`; la actualización es idempotente.
export async function POST(request: Request, ctx: RouteContext<"/api/webhooks/[proveedor]">) {
  const { proveedor } = await ctx.params;
  const provider = providerById(proveedor);
  if (!provider?.parseWebhook) return Response.json({ error: "Pasarela no configurada" }, { status: 404 });
  const update = provider.parseWebhook(await request.json().catch(() => null), request.headers);
  if (!update) return Response.json({ error: "Firma inválida" }, { status: 401 });
  await applyPaymentUpdate(update);
  return Response.json({ ok: true });
}
