"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, ChevronDown, Lock, Minus, Sparkles, Tag } from "lucide-react";
import { useUiVariant } from "@/lib/experiments";
import type { ScoredOffer } from "@/domain/types";
import { COVERAGE_KEYS } from "@/domain/types";
import { COVERAGE_LABELS, formatCOP, formatMillions, SERVICE_LABELS } from "@/domain/labels";
import { discountTotal } from "@/domain/discounts";
import { Badge, Button, ButtonLink, Card, InsurerLogo } from "@/components/ui";
import { discountProps, track } from "@/lib/analytics";

const LABELS = {
  recomendado: { text: "Recomendado para ti", tone: "brand" },
  menorPrecio: { text: "Menor precio", tone: "mint" },
  mayorCobertura: { text: "Mayor cobertura", tone: "sun" },
  empate: { text: "Empate técnico", tone: "neutral" },
} as const;

export function OfferCard({
  offer,
  comparing,
  onToggleCompare,
  compareDisabled,
  highlight = false,
}: {
  offer: ScoredOffer;
  comparing: boolean;
  onToggleCompare: () => void;
  compareDisabled: boolean;
  highlight?: boolean;
}) {
  const [open, setOpen] = useState(highlight);
  // Experimento A/B: texto del botón de compra ("Lo quiero" o con el precio).
  const priceInButton = useUiVariant("boton-oferta-1") === "comprar-precio";
  const detailId = `detalle-${offer.id.replace(":", "-")}`;

  return (
    <Card className={`p-5 ${highlight ? "ring-2 ring-brand" : comparing ? "ring-2 ring-brand/50" : ""}`}>
      <article aria-labelledby={`${detailId}-t`} className="md:grid md:grid-cols-[minmax(0,1fr)_17rem] md:gap-x-6">
        <div className="flex items-start gap-3 md:col-start-1 md:row-start-1">
          <InsurerLogo id={offer.insurerId} name={offer.insurerName} />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap gap-1.5">
              {offer.discounts?.map((d) => (
                <Badge key={d.ruleId} tone="mint">
                  <Tag className="size-3" aria-hidden />
                  {d.label}
                </Badge>
              ))}
              {offer.labels.map((l) => (
                <Badge key={l} tone={LABELS[l].tone}>
                  {l === "recomendado" && <Sparkles className="size-3" aria-hidden />}
                  {LABELS[l].text}
                </Badge>
              ))}
            </div>
            <h3 id={`${detailId}-t`} className="font-bold text-heading">
              {offer.planName}
            </h3>
            <p className="text-sm text-muted">{offer.insurerName}</p>
          </div>
          <ScoreRing score={offer.score} />
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 rounded-2xl bg-canvas p-4 md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0 md:flex-col md:items-stretch md:justify-center">
          <div>
            {offer.listPremium && (
              <p className="text-sm text-muted">
                <span className="sr-only">Antes: </span>
                <s>{formatCOP(offer.listPremium)}</s>{" "}
                <span className="font-semibold text-mint">−{formatCOP(discountTotal(offer))}</span>
              </p>
            )}
            <p className="whitespace-nowrap text-2xl font-extrabold tracking-tight text-heading">
              {formatCOP(offer.annualPremium)}
              <span className="text-sm font-semibold text-muted"> /año</span>
            </p>
            <p className="text-sm text-muted">
              o {formatCOP(offer.monthlyPremium)} al mes
            </p>
          </div>
          <div className="text-right text-xs text-muted md:border-t md:border-line md:pt-3 md:text-left">
            <p>Deducible</p>
            <p className="text-sm font-bold text-heading">
              {offer.deductiblePct === 0 ? "Sin deducible" : `${offer.deductiblePct}% · mín ${offer.deductibleMinSmmlv} SMMLV`}
            </p>
          </div>
        </div>

        <div className="md:col-start-1 md:row-start-2">
        {offer.reasons.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {offer.reasons.slice(0, highlight ? 4 : 2).map((r) => (
              <li key={r} className="flex gap-2 text-sm text-ink">
                <Check className="mt-0.5 size-4 shrink-0 text-mint" aria-hidden />
                {r}
              </li>
            ))}
          </ul>
        )}
        {offer.warnings.map((w) => (
          <p key={w} className="mt-2 flex gap-2 text-sm text-sun-ink">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {w}
          </p>
        ))}

        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailId}
          onClick={() => {
            if (!open) track("detalle_abierto", { aseguradora: offer.insurerId });
            setOpen(!open);
          }}
          className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand"
        >
          {open ? "Ocultar detalle" : "Ver coberturas y servicios"}
          <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
        </div>

        {open && (
          <div id={detailId} className="mt-2 grid gap-4 border-t border-line pt-4 sm:grid-cols-2 md:col-span-2 md:row-start-4">
            <div>
              <h4 className="mb-2 text-sm font-bold text-heading">Coberturas</h4>
              <ul className="space-y-1.5 text-sm">
                {COVERAGE_KEYS.map((k) => (
                  <li key={k} className={`flex items-center gap-2 ${offer.coverages[k] ? "text-ink" : "text-muted line-through"}`}>
                    {offer.coverages[k] ? (
                      <Check className="size-4 text-mint" aria-label="Incluye" />
                    ) : (
                      <Minus className="size-4" aria-label="No incluye" />
                    )}
                    {COVERAGE_LABELS[k]}
                    {k === "rc" && ` · ${formatMillions(offer.rcLimit)}`}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-bold text-heading">Servicios</h4>
              <ul className="space-y-1.5 text-sm">
                {offer.services.map((s) => (
                  <li key={s} className="flex items-center gap-2">
                    <Check className="size-4 text-mint" aria-hidden />
                    {SERVICE_LABELS[s]}
                    {s === "autoSustituto" && ` · ${offer.substituteCarDays} días`}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">
                Precio válido hasta {offer.validUntil}.
              </p>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-bold text-heading">Exclusiones principales</h4>
              <ul className="space-y-1 text-sm text-muted">
                {(offer.exclusions ?? []).slice(0, 4).map((e) => (
                  <li key={e} className="flex gap-2"><Minus className="mt-0.5 size-4 shrink-0" aria-hidden />{e}</li>
                ))}
              </ul>
            </div>
            <div className="text-sm">
              <h4 className="mb-2 font-bold text-heading">Prima anual</h4>
              <dl className="space-y-1">
                {offer.discounts?.map((d) => (
                  <div key={d.ruleId} className="flex justify-between text-mint"><dt>{d.label}</dt><dd>−{formatCOP(d.amount)}</dd></div>
                ))}
                <div className="flex justify-between"><dt className="text-muted">Prima sin IVA</dt><dd>{formatCOP(offer.netPremium)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">IVA (19%)</dt><dd>{formatCOP(offer.iva)}</dd></div>
                <div className="flex justify-between font-bold text-heading"><dt>Total</dt><dd>{formatCOP(offer.annualPremium)}</dd></div>
              </dl>
              <Link href={offer.conditionsUrl} target="_blank" className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand underline">
                Ver condicionado completo
              </Link>
            </div>
          </div>
        )}

        <div className={`mt-4 grid gap-2 md:col-start-2 md:row-start-3 md:mt-3 [&>*]:whitespace-nowrap [&>*]:px-3 ${priceInButton ? "grid-cols-[auto_1fr]" : "grid-cols-2"}`}>
          <Button
            variant="secondary"
            type="button"
            aria-pressed={comparing}
            disabled={!comparing && compareDisabled}
            onClick={onToggleCompare}
          >
            {comparing ? "Quitar" : "Comparar"}
          </Button>
          <ButtonLink
            href={`/checkout?oferta=${encodeURIComponent(offer.id)}`}
            onClick={() => track("oferta_elegida", { aseguradora: offer.insurerId, plan: offer.planName, recomendado: offer.labels.includes("recomendado"), ...discountProps(offer) })}
          >
            {priceInButton ? `Comprar por ${formatCOP(offer.annualPremium)}` : "Lo quiero"}
          </ButtonLink>
        </div>
        {highlight && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted md:col-start-2 md:row-start-4">
            <Lock className="size-3.5" aria-hidden /> Pago seguro con Wompi · 5 días hábiles para arrepentirte
          </p>
        )}
      </article>
    </Card>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-14 shrink-0" role="img" aria-label={`Afinidad ${score} de 100`}>
      <svg viewBox="0 0 48 48" className="size-14 -rotate-90" aria-hidden>
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--color-brand-soft)" strokeWidth="5" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={score >= 70 ? "var(--color-mint)" : score >= 45 ? "var(--color-brand)" : "var(--color-muted)"}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-extrabold text-heading">{score}</span>
        <span className="text-[9px] font-semibold text-muted">afinidad</span>
      </span>
    </div>
  );
}
