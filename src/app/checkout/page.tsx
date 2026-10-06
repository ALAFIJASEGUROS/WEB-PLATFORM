import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getCurrentUser } from "@/server/auth";
import { paymentProvider } from "@/server/payments";

export const metadata: Metadata = { title: "Comprar", robots: { index: false } };

export default async function Page({ searchParams }: PageProps<"/checkout">) {
  const { oferta } = await searchParams;
  const user = await getCurrentUser();
  return (
    <CheckoutForm
      offerId={typeof oferta === "string" ? oferta : ""}
      defaultEmail={user?.email}
      simulatedPayments={paymentProvider().id === "simulado"}
    />
  );
}
