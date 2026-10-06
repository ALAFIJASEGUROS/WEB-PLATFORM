import type { Metadata } from "next";
import Link from "next/link";
import { Bike, CarFront } from "lucide-react";

export const metadata: Metadata = { title: "Cotizar seguro" };

export default function CotizarPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-heading">
        ¿Qué quieres asegurar?
      </h1>
      <p className="mt-2 text-muted">Por ahora cotizamos carros y motos particulares.</p>
      <div className="mt-6 grid gap-3">
        {[
          { href: "/cotizar/auto", icon: CarFront, title: "Carro", text: "Automóviles, camionetas y SUV de uso particular." },
          { href: "/cotizar/moto", icon: Bike, title: "Moto", text: "Motos de cualquier cilindraje, también para domicilios." },
        ].map((o) => (
          <Link
            key={o.href}
            href={o.href}
            className="flex items-center gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)] transition hover:ring-2 hover:ring-brand"
          >
            <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <o.icon className="size-7" aria-hidden />
            </span>
            <span>
              <span className="block text-lg font-bold text-heading">{o.title}</span>
              <span className="block text-sm text-muted">{o.text}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
