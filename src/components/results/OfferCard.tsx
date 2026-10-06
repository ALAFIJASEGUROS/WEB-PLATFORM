"use client";

import { useState } from "react";
import { AlertTriangle, Check, ChevronDown, Minus, Sparkles } from "lucide-react";
import type { ScoredOffer } from "@/domain/types";
import { COVERAGE_KEYS } from "@/domain/types";
import { COVERAGE_LABELS, formatCOP, formatMillions, SERVICE_LABELS } from "@/domain/labels";
import { Badge, Button, ButtonLink, Card, InsurerLogo } from "@/components/ui";

const LABELS = {
  recomendado: { text: "Recomendado para ti", tone: "brand" },
  menorPrecio: { text: "Menor precio", tone: "mint" },
  mayorCobertura: { text: "Mayor cobertura", tone: "sun" },
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
  const detailId = `detalle-${offer.id.replace(":", "-")}`;

  return (
    <Card className={`p-5 ${highlight ? "ring-2 ring-brand" : comparing ? "ring-2 ring-brand/50" : ""}`}>
      <article aria-labelledby={`${detailId}-t`}>
        <div className="flex items-start gap-3">
          <InsurerLogo id={offer.insurerId} name={offer.insurerName} />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap gap-1.5">
              {offer.labels.map((l) => (
                <Badge key={l} tone={LABELS[l].tone}>
                  {l === "recomendado" && <Sparkles className="size-3" aria-hidden />}
                  {LABELS[l].text}
                </Badge>
              ))}
            </div>
            <h3 id={`${detailId}-t`} className="font-bold text-navy">
              {offer.planName}
            </h3>
            <p className="text-sm text-muted">{offer.insurerName}</p>
          </div>
          <ScoreRing score={offer.score} />
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 rounded-2xl bg-canvas p-4">
          <div>
            <p className="whitespace-nowrap text-2xl font-extrabold tracking-tight text-navy">
              {formatCOP(offer.annualPremium)}
              <span className="text-sm font-semibold text-muted"> /año</span>
            </p>
            <p className="text-sm text-muted">
              o {formatCOP(offer.monthlyPremium)} al mes
            </p>
          </div>
          <div className="text-right text-xs text-muted">
            <p>Deducible</p>
            <p className="text-sm font-bold text-navy">
              {offer.deductiblePct === 0 ? "Sin deducible" : `${offer.deductiblePct}% · mín ${offer.deductibleMinSmmlv} SMMLV`}
            </p>
          </div>
        </div>

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
          <p key={w} className="mt-2 flex gap-2 text-sm text-[#8a5a00]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {w}
          </p>
        ))}

        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailId}
          onClick={() => setOpen(!open)}
          className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand"
        >
          {open ? "Ocultar detalle" : "Ver coberturas y servicios"}
          <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>

        {open && (
          <div id={detailId} className="mt-2 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-bold text-navy">Coberturas</h4>
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
              <h4 className="mb-2 text-sm font-bold text-navy">Servicios</h4>
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
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            type="button"
            aria-pressed={comparing}
            disabled={!comparing && compareDisabled}
            onClick={onToggleCompare}
          >
            {comparing ? "Quitar" : "Comparar"}
          </Button>
          <ButtonLink href={`/checkout?oferta=${encodeURIComponent(offer.id)}`}>
            Lo quiero
          </ButtonLink>
        </div>
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
        <span className="text-sm font-extrabold text-navy">{score}</span>
        <span className="text-[9px] font-semibold text-muted">afinidad</span>
      </span>
    </div>
  );
}
