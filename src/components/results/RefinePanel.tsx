"use client";

import { useMemo, useState } from "react";
import type { DeductibleTolerance, QuoteRequest, QuoteResponse, Weights } from "@/domain/types";
import { PRIORITY_LABELS } from "@/domain/labels";
import { weightsFromPriority } from "@/recommendation/scoring";
import { rescore } from "@/recommendation/refine";
import { quoteStore } from "@/lib/quote-store";
import { track } from "@/lib/analytics";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/ui";
import { WeightSliders } from "@/components/quote/WeightSliders";
import { Term } from "@/components/Term";

const DEDUCTIBLE_OPTIONS: { value: DeductibleTolerance; label: string }[] = [
  { value: "bajo", label: "Lo mínimo" },
  { value: "medio", label: "Razonable" },
  { value: "alto", label: "Alto" },
];

export function RefinePanel({
  open,
  onClose,
  request,
  response,
}: {
  open: boolean;
  onClose: () => void;
  request: QuoteRequest;
  response: QuoteResponse;
}) {
  const a = request.answers;
  const [weights, setWeights] = useState<Weights>(a.weights ?? weightsFromPriority(a.priority));
  const [ded, setDed] = useState<DeductibleTolerance>(a.deductibleTolerance);
  const next = useMemo(() => rescore(request, response, { ...a, weights, deductibleTolerance: ded }), [request, response, a, weights, ded]);
  const top = next.response.offers[0];
  const changed = top && top.id !== response.offers[0]?.id;

  function apply() {
    quoteStore.refine(next.request, next.response);
    track("pesos_afinados", { precio: weights.price, cobertura: weights.coverage, servicios: weights.services, deducible: ded, cambio_recomendacion: !!changed });
    onClose();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Afinar recomendación"
      footer={<Button className="w-full" onClick={apply}>Reordenar opciones</Button>}
    >
      <p className="text-sm text-muted">¿Qué pesa más para ti? Reordenamos las mismas opciones, sin volver a cotizar.</p>
      <WeightSliders value={weights} onChange={setWeights} />
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-heading">
          <Term id="deducible">Deducible</Term> que aceptas
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {DEDUCTIBLE_OPTIONS.map((o) => (
            <label
              key={o.value}
              className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-2 border-line px-2 text-center text-sm font-semibold text-heading has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand"
            >
              <input type="radio" name="refine-ded" value={o.value} checked={ded === o.value} onChange={() => setDed(o.value)} className="sr-only" />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        onClick={() => { setWeights(weightsFromPriority(a.priority)); setDed(a.deductibleTolerance); }}
        className="min-h-11 text-sm font-semibold text-brand hover:underline"
      >
        Volver a los pesos de “{PRIORITY_LABELS[a.priority].toLowerCase()}”
      </button>
      {top && (
        <p role="status" className="rounded-xl bg-canvas px-3 py-2 text-sm text-ink">
          {changed ? "Con estos ajustes te recomendaríamos " : "Seguiríamos recomendando "}
          <strong>{top.planName}</strong> de {top.insurerName} ({top.score}% de afinidad).
        </p>
      )}
    </BottomSheet>
  );
}
