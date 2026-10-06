"use client";

import { Check, Minus } from "lucide-react";
import type { ScoredOffer } from "@/domain/types";
import { COVERAGE_KEYS, SERVICE_KEYS } from "@/domain/types";
import { COVERAGE_LABELS, formatCOP, formatMillions, SERVICE_LABELS } from "@/domain/labels";
import { useCompare, useHydrated, useQuoteResponse } from "@/lib/quote-store";
import { ButtonLink, InsurerLogo } from "@/components/ui";

function Yes({ ok }: { ok: boolean }) {
  return ok ? (
    <Check className="mx-auto size-5 text-mint" aria-label="Sí" />
  ) : (
    <Minus className="mx-auto size-5 text-muted" aria-label="No" />
  );
}

export function CompareView() {
  const hydrated = useHydrated();
  const ids = useCompare();
  const response = useQuoteResponse();
  const all = response?.offers ?? [];
  const offers = ids
    .map((id) => all.find((o) => o.id === id))
    .filter((o): o is ScoredOffer => !!o);

  if (!hydrated) return null;
  if (offers.length < 2) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-navy">Elige al menos 2 opciones</h1>
        <ButtonLink href="/resultados" className="mt-6">Volver a resultados</ButtonLink>
      </div>
    );
  }

  const rows: { label: string; render: (o: ScoredOffer) => React.ReactNode }[] = [
    { label: "Precio anual", render: (o) => <strong>{formatCOP(o.annualPremium)}</strong> },
    { label: "Precio mensual", render: (o) => formatCOP(o.monthlyPremium) },
    { label: "Afinidad contigo", render: (o) => <span className="font-bold text-brand">{o.score}%</span> },
    { label: "Deducible", render: (o) => (o.deductiblePct ? `${o.deductiblePct}%` : "Sin deducible") },
    { label: "Límite RC", render: (o) => formatMillions(o.rcLimit) },
    ...COVERAGE_KEYS.filter((k) => k !== "rc").map((k) => ({
      label: COVERAGE_LABELS[k],
      render: (o: ScoredOffer) => <Yes ok={o.coverages[k]} />,
    })),
    ...SERVICE_KEYS.map((s) => ({
      label: SERVICE_LABELS[s],
      render: (o: ScoredOffer) => <Yes ok={o.services.includes(s)} />,
    })),
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-navy">Comparación</h1>
      <div className="overflow-x-auto rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
        <table className="w-full table-fixed border-collapse text-sm" style={{ minWidth: 104 + offers.length * 136 }}>
          <caption className="sr-only">Comparación de seguros seleccionados</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 w-[104px] bg-white p-2 text-left text-xs text-muted sm:w-40 sm:p-3">
                Plan
              </th>
              {offers.map((o) => (
                <th key={o.id} scope="col" className="p-2 align-top sm:p-3">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <InsurerLogo id={o.insurerId} name={o.insurerName} />
                    <span className="font-bold text-navy">{o.planName}</span>
                    <span className="text-xs font-normal text-muted">{o.insurerName}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-line">
                <th scope="row" className="sticky left-0 bg-white p-2 text-left text-xs font-medium text-muted sm:p-3 sm:text-sm">
                  {r.label}
                </th>
                {offers.map((o) => (
                  <td key={o.id} className="p-2 text-center text-ink sm:p-3">{r.render(o)}</td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-line">
              <td className="sticky left-0 bg-white" />
              {offers.map((o) => (
                <td key={o.id} className="p-2 sm:p-3">
                  <ButtonLink href={`/checkout?oferta=${encodeURIComponent(o.id)}`} className="w-full px-3">
                    Lo quiero
                  </ButtonLink>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
