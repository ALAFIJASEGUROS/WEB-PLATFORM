"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, Minus } from "lucide-react";
import type { ScoredOffer } from "@/domain/types";
import { COVERAGE_KEYS, SERVICE_KEYS } from "@/domain/types";
import { COVERAGE_LABELS, formatCOP, formatMillions, SERVICE_LABELS } from "@/domain/labels";
import { useCompare, useHydrated, useQuoteResponse } from "@/lib/quote-store";
import { ButtonLink, InsurerLogo } from "@/components/ui";
import { discountProps, track } from "@/lib/analytics";
import { useUiVariant } from "@/lib/experiments";

function Yes({ ok }: { ok: boolean }) {
  return ok ? (
    <Check className="mx-auto size-5 text-mint" aria-label="Sí" />
  ) : (
    <Minus className="mx-auto size-5 text-muted" aria-label="No" />
  );
}

export function CompareView() {
  const hydrated = useHydrated();
  const priceInButton = useUiVariant("boton-oferta-1") === "comprar-precio";
  const ids = useCompare();
  const [onlyDiff, setOnlyDiff] = useState(false);
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

  // `value` sirve para detectar si la fila cambia entre las opciones ("Solo diferencias").
  const allRows: { label: string; value: (o: ScoredOffer) => string | number | boolean; render: (o: ScoredOffer) => React.ReactNode }[] = [
    { label: "Precio anual", value: (o) => o.annualPremium, render: (o) => best(cheapest, o, <strong>{formatCOP(o.annualPremium)}</strong>) },
    { label: "Precio mensual", value: (o) => o.monthlyPremium, render: (o) => formatCOP(o.monthlyPremium) },
    {
      label: "Descuento",
      value: (o) => (o.discounts ?? []).map((d) => d.ruleId).join(),
      render: (o) => (o.discounts?.length ? o.discounts.map((d) => `${d.label} (−${formatCOP(d.amount)})`).join(", ") : "—"),
    },
    { label: "Afinidad contigo", value: (o) => o.score, render: (o) => best(topScore, o, <span className="font-bold text-brand">{o.score}%</span>) },
    { label: "Deducible", value: (o) => o.deductiblePct, render: (o) => best(lowDed, o, o.deductiblePct ? `${o.deductiblePct}%` : "Sin deducible") },
    { label: "Límite RC", value: (o) => o.rcLimit, render: (o) => best(topRc, o, formatMillions(o.rcLimit)) },
    ...COVERAGE_KEYS.filter((k) => k !== "rc").map((k) => ({
      label: COVERAGE_LABELS[k],
      value: (o: ScoredOffer) => o.coverages[k],
      render: (o: ScoredOffer) => <Yes ok={o.coverages[k]} />,
    })),
    ...SERVICE_KEYS.map((s) => ({
      label: SERVICE_LABELS[s],
      value: (o: ScoredOffer) => o.services.includes(s),
      render: (o: ScoredOffer) => <Yes ok={o.services.includes(s)} />,
    })),
  ];
  const differs = (r: (typeof allRows)[number]) => new Set(offers.map(r.value)).size > 1;
  const rows = onlyDiff ? allRows.filter(differs) : allRows;
  const hidden = allRows.length - rows.length;
  const buy = (o: ScoredOffer, className: string) => (
    <ButtonLink
      href={`/checkout?oferta=${encodeURIComponent(o.id)}`}
      className={className}
      onClick={() => track("oferta_elegida", { aseguradora: o.insurerId, plan: o.planName, recomendado: o.labels.includes("recomendado"), desde: "comparador", ...discountProps(o) })}
    >
      {priceInButton ? `Comprar · ${formatCOP(o.annualPremium)}` : "Lo quiero"}
    </ButtonLink>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link href="/resultados" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted hover:text-heading">
        <ArrowLeft className="size-4" aria-hidden /> Volver a opciones
      </Link>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-heading">Comparación</h1>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-heading">
          <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} className="size-5 accent-[var(--color-brand)]" />
          Solo diferencias
        </label>
      </div>
      {onlyDiff && hidden > 0 && (
        <p className="mb-3 text-sm text-muted">Ocultamos {hidden} {hidden === 1 ? "fila igual" : "filas iguales"} en todas las opciones.</p>
      )}

      {/* Celular: una tarjeta por atributo con el valor de cada opción. */}
      <div className="space-y-3 md:hidden">
        <ol className="grid gap-2" aria-label="Opciones comparadas">
          {offers.map((o, i) => (
            <li key={o.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-[var(--shadow-card)]">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">{i + 1}</span>
              <InsurerLogo id={o.insurerId} name={o.insurerName} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-heading">{o.planName}</span>
                <span className="block text-xs text-muted">{o.insurerName}</span>
              </span>
            </li>
          ))}
        </ol>
        {rows.map((r) => (
          <section key={r.label} className="rounded-2xl bg-surface p-3 shadow-[var(--shadow-card)]" aria-label={r.label}>
            <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{r.label}</h2>
            <dl className="space-y-1">
              {offers.map((o, i) => (
                <div key={o.id} className="flex items-center justify-between gap-3 text-sm">
                  <dt className="flex min-w-0 items-center gap-2 text-ink">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand">{i + 1}</span>
                    <span className="truncate">{o.planName}</span>
                  </dt>
                  <dd className="shrink-0 text-right text-ink">{r.render(o)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <div className="grid gap-2">
          {offers.map((o, i) => (
            <div key={o.id} className="flex items-center gap-3">
              <span className="w-24 shrink-0 truncate text-sm font-semibold text-heading">{i + 1}. {o.planName}</span>
              {buy(o, "flex-1 px-3")}
            </div>
          ))}
        </div>
      </div>

      <div className="hidden overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)] md:block">
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
                <td key={o.id} className="p-2 sm:p-3">{buy(o, "w-full px-3")}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
