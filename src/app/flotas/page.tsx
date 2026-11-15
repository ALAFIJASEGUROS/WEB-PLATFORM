import Link from "next/link";
import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { SimulatedDataNotice } from "@/components/ui";
import { FleetQuote } from "@/components/fleet/FleetQuote";

export const metadata: Metadata = {
  title: "Seguros para flotas de carros y motos",
  description: "Cotiza el seguro de todos los vehículos de tu empresa en un solo paso: mensajería, domicilios y vehículos de trabajo.",
};

export default function Page() {
  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-heading">Seguros para la flota de tu empresa</h1>
          <p className="text-lg text-muted">
            Mensajería, domicilios o vehículos de trabajo: escribe las placas y te mostramos la mejor opción para cada uno y el total.
          </p>
          <p className="text-sm text-muted">
            ¿Quieres ofrecer el seguro del carro o la moto personal a tus empleados?{" "}
            <Link href="/empresas" className="font-semibold text-brand hover:underline">Conoce el beneficio para empleados</Link>.
          </p>
          <SimulatedDataNotice />
        </header>
        <FleetQuote />
      </div>
      <Footer />
    </>
  );
}
