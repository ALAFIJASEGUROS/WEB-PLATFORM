import { notFound } from "next/navigation";
import { getOrderForViewer } from "@/server/orders";
import { SimulatedCheckout } from "./SimulatedCheckout";

export const metadata = { title: "Pago", robots: { index: false } };

export default async function Page({ searchParams }: PageProps<"/pago/simulado">) {
  const { ref, t } = await searchParams;
  const order =
    typeof ref === "string" && typeof t === "string" ? getOrderForViewer(ref, t) : null;
  if (!order) notFound();
  return (
    <SimulatedCheckout
      reference={order.reference}
      token={order.accessToken}
      amount={order.amountInCents / 100}
      description={`${order.offer.planName} · ${order.offer.insurerName}`}
    />
  );
}
