import { checkoutSchema } from "@/domain/schemas";
import { baseUrl, getCurrentUser } from "@/server/auth";
import { CheckoutError, createOrder } from "@/server/orders";
import { paymentProvider } from "@/server/payments";

export async function POST(request: Request) {
  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Revisa los datos del formulario.", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  try {
    const user = await getCurrentUser();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? undefined;
    const order = await createOrder(parsed.data, user?.id, { ip, userAgent: request.headers.get("user-agent") ?? undefined });
    const { redirectUrl } = await paymentProvider().createCheckout(order, await baseUrl());
    return Response.json({ reference: order.reference, redirectUrl });
  } catch (e) {
    if (e instanceof CheckoutError) {
      return Response.json({ error: e.message }, { status: 409 });
    }
    throw e;
  }
}
