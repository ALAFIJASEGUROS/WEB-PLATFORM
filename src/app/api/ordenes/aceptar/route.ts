import { z } from "zod";
import { baseUrl } from "@/server/auth";
import { CheckoutError, confirmAcceptance } from "@/server/orders";
import { paymentProvider, providerById } from "@/server/payments";

const schema = z.object({
  reference: z.string().max(60),
  token: z.string().max(80),
  code: z.string().regex(/^\d{6}$/, "El código tiene 6 dígitos."),
});

// Verifica el código de aceptación y, si es correcto, devuelve la URL de pago.
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "El código tiene 6 dígitos." }, { status: 400 });
  const { reference, token, code } = parsed.data;
  try {
    const order = confirmAcceptance(reference, token, code, {
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    // La orden se cobra con la pasarela que quedó registrada al crearla; si ya
    // no está configurada, con la predeterminada.
    const provider = providerById(order.provider) ?? paymentProvider();
    order.provider = provider.id;
    const { redirectUrl } = await provider.createCheckout(order, await baseUrl());
    return Response.json({ redirectUrl });
  } catch (e) {
    if (e instanceof CheckoutError) return Response.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
