import { checkoutSchema } from "@/domain/schemas";
import { getCurrentUser, otpShownOnScreen } from "@/server/auth";
import { CheckoutError, createOrder, PriceChangedError, startAcceptance } from "@/server/orders";

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
    // Antes de pagar, el tomador acepta las condiciones con un código enviado a su correo.
    const { demoCode } = startAcceptance(order, otpShownOnScreen());
    return Response.json({ reference: order.reference, token: order.accessToken, acceptance: true, demoCode });
  } catch (e) {
    if (e instanceof PriceChangedError) {
      return Response.json(
        { error: e.message, priceChanged: { previous: e.previous, current: e.current } },
        { status: 409 },
      );
    }
    if (e instanceof CheckoutError) {
      return Response.json({ error: e.message }, { status: 409 });
    }
    throw e;
  }
}
