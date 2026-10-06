import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuoteWizard } from "@/components/quote/QuoteWizard";
import { availableLines } from "@/domain/lines";

export async function generateMetadata({
  params,
}: PageProps<"/cotizar/[tipo]">): Promise<Metadata> {
  const { tipo } = await params;
  return { title: `Cotizar seguro de ${tipo === "moto" ? "moto" : "carro"}` };
}

export function generateStaticParams() {
  return availableLines().map((l) => ({ tipo: l.id }));
}

export default async function Page({ params }: PageProps<"/cotizar/[tipo]">) {
  const { tipo } = await params;
  if (tipo !== "auto" && tipo !== "moto") notFound();
  return <QuoteWizard type={tipo} />;
}
