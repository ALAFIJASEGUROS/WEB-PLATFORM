"use client";

import Link from "next/link";
import { ArrowLeft, Check, Minus } from "lucide-react";
import type { ScoredOffer } from "@/domain/types";
import { COVERAGE_KEYS, SERVICE_KEYS } from "@/domain/types";
import { COVERAGE_LABELS, formatCOP, formatMillions, SERVICE_LABELS } from "@/domain/labels";
import { useCompare, useHydrated, useQuoteResponse } from "@/lib/quote-store";
import { ButtonLink, InsurerLogo } from "@/components/ui";
import { track } from "@/lib/analytics";

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
        <h1 className="text-2xl font-extrabold text-heading">Elige al menos 2 opciones</h1>
        <ButtonLink href="/resultados" className="mt-6">Volver a resultados</ButtonLink>
      </div>
    );
  }

  const bestBy = (f: (o: ScoredOffer) => number, dir: 1 | -1) => {
    const vals = offers.map(f);
    const target = dir === 1 ? Math.max(...vals) : Math.min(...vals);
    return (o: ScoredOffer) => vals.filter((v) => v === target).length < offers.length && f(o) === target;
  };
  const best = (isBest: (o: ScoredOffer) => boolean, o: ScoredOffer, node: React.ReactNode) => (
    <span className="inline-flex flex-col items-center gap-1">
      {node}
      {isBest(o) && <span className="rounded-full bg-mint-soft px-2 py-0.5 text-[10px] font-bold text-mint">Mejor</span>}
    </span>
  );
  const cheapest = bestBy((o) => o.annualPremium, -1);
  const topScore = bestBy((o) => o.score, 1);
  const lowDed = bestBy((o) => o.deductiblePct, -1);
  const topRc = bestBy((o) => o.rcLimit, 1);

  const rows: { label: string; render: (o: ScoredOffer) => React.ReactNode }[] = [
    { label: "Precio anual", render: (o) => best(cheapest, o, <strong>{formatCOP(o.annualPremium)}</strong>) },
    { label: "Precio mensual", render: (o) => formatCOP(o.monthlyPremium) },
    { label: "Descuento", render: (o) => (o.discounts?.length ? o.discounts.map((d) => `${d.label} (−${formatCOP(d.amount)})`).join(", ") : "—") },
    { label: "Afinidad contigo", render: (o) => best(topScore, o, <span className="font-bold text-brand">{o.score}%</span>) },
    { label: "Deducible", render: (o) => best(lowDed, o, o.deductiblePct ? `${o.deductiblePct}%` : "Sin deducible") },
    { label: "Límite RC", render: (o) => best(topRc, o, formatMillions(o.rcLimit)) },
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
      <Link href="/resultados" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted hover:text-heading">
        <ArrowLeft className="size-4" aria-hidden /> Volver a opciones
      </Link>
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-heading">Comparación</h1>
      <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
        <table className="w-full table-fixed border-collapse text-sm" style={{ minWidth: 104 + offers.length * 120 }}>
          <caption className="sr-only">Comparación de seguros seleccionados</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 w-[104px] bg-surface p-2 text-left text-xs text-muted sm:w-40 sm:p-3">
                Plan
              </th>
              {offers.map((o) => (
                <th key={o.id} scope="col" className="p-2 align-top sm:p-3">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <InsurerLogo id={o.insurerId} name={o.insurerName} />
                    <span className="font-bold text-heading">{o.planName}</span>
                    <span className="text-xs font-normal text-muted">{o.insurerName}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-line">
                <th scope="row" className="sticky left-0 bg-surface p-2 text-left text-xs font-medium text-muted sm:p-3 sm:text-sm">
                  {r.label}
                </th>
                {offers.map((o) => (
                  <td key={o.id} className="p-2 text-center text-ink sm:p-3">{r.render(o)}</td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-line">
              <td className="sticky left-0 bg-surface" />
              {offers.map((o) => (
                <td key={o.id} className="p-2 sm:p-3">
                  <ButtonLink
                    href={`/checkout?oferta=${encodeURIComponent(o.id)}`}
                    className="w-full px-3"
                    onClick={() => track("oferta_elegida", { aseguradora: o.insurerId, plan: o.planName, recomendado: o.labels.includes("recomendado"), desde: "comparador" })}
                  >
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
