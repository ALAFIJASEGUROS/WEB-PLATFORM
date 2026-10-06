import type { Metadata } from "next";
import Link from "next/link";
import { Bike, CarFront, FileText, House, Plane } from "lucide-react";
import { LINES, type InsuranceLine } from "@/domain/lines";

export const metadata: Metadata = { title: "Cotizar seguro" };

const ICONS: Record<InsuranceLine["icon"], typeof CarFront> = {
  car: CarFront,
  bike: Bike,
  file: FileText,
  home: House,
  plane: Plane,
};

export default function CotizarPage() {
  const available = LINES.filter((l) => l.status === "disponible");
  const soon = LINES.filter((l) => l.status === "proximamente");
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-heading">¿Qué quieres asegurar?</h1>
      <p className="mt-2 text-muted">Por ahora cotizamos carros y motos particulares.</p>
      <div className="mt-6 grid gap-3">
        {available.map((l) => {
          const Icon = ICONS[l.icon];
          return (
            <Link
              key={l.id}
              href={`/cotizar/${l.id}`}
              className="flex items-center gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)] transition hover:ring-2 hover:ring-brand"
            >
              <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <Icon className="size-7" aria-hidden />
              </span>
              <span>
                <span className="block text-lg font-bold text-heading">{l.label}</span>
                <span className="block text-sm text-muted">{l.description}</span>
              </span>
            </Link>
          );
        })}
      </div>

      {soon.length > 0 && (
        <section aria-labelledby="pronto" className="mt-8">
          <h2 id="pronto" className="text-sm font-bold uppercase tracking-wide text-muted">Próximamente</h2>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {soon.map((l) => {
              const Icon = ICONS[l.icon];
              return (
                <li key={l.id} className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-line p-3 text-center text-muted">
                  <Icon className="size-5" aria-hidden />
                  <span className="text-sm font-semibold text-heading">{l.label}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
