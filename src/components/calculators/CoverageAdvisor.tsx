"use client";

import { useState } from "react";
import { COVERAGE_ADVICE_LABELS, coverageAdvice } from "@/domain/calculators";
import { formatCOP } from "@/domain/labels";
import { ButtonLink, Field, inputClass } from "@/components/ui";

const num = (v: string) => Math.max(0, Number(v.replace(/\D/g, "")) || 0);

/** ¿Me conviene todo riesgo o solo responsabilidad civil? */
export function CoverageAdvisor() {
  const [vehicleType, setType] = useState<"auto" | "moto">("auto");
  const [value, setValue] = useState(60_000_000);
  const [savings, setSavings] = useState(10_000_000);
  const [financed, setFinanced] = useState(false);
  const [needsItToWork, setWork] = useState(false);
  const r = coverageAdvice({ vehicleType, value, savings, financed, needsItToWork });
  const label = COVERAGE_ADVICE_LABELS[r.advice];

  return (
    <div className="space-y-5">
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="mb-2 text-sm font-semibold text-heading">Vehículo</legend>
        {(["auto", "moto"] as const).map((t) => (
          <label key={t} className="flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border-2 border-line font-semibold text-heading has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand">
            <input type="radio" name="adv-type" className="sr-only" checked={vehicleType === t} onChange={() => setType(t)} />
            {t === "auto" ? "Carro" : "Moto"}
          </label>
        ))}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Valor aproximado del vehículo" htmlFor="adv-value" hint={formatCOP(value)}>
          <input id="adv-value" inputMode="numeric" className={inputClass} value={value.toLocaleString("es-CO")} onChange={(e) => setValue(num(e.target.value))} />
        </Field>
        <Field label="Ahorros que podrías usar para repararlo o reponerlo" htmlFor="adv-savings" hint={formatCOP(savings)}>
          <input id="adv-savings" inputMode="numeric" className={inputClass} value={savings.toLocaleString("es-CO")} onChange={(e) => setSavings(num(e.target.value))} />
        </Field>
      </div>
      <div className="space-y-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-heading">
          <input type="checkbox" className="size-5 accent-[var(--color-brand)]" checked={financed} onChange={(e) => setFinanced(e.target.checked)} />
          Está financiado (tiene crédito o prenda)
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-heading">
          <input type="checkbox" className="size-5 accent-[var(--color-brand)]" checked={needsItToWork} onChange={(e) => setWork(e.target.checked)} />
          Lo uso para trabajar
        </label>
      </div>
      <section aria-live="polite" aria-labelledby="adv-result" className="space-y-2 rounded-2xl bg-canvas p-4">
        <p className="text-sm text-muted">Te conviene</p>
        <h2 id="adv-result" className="text-2xl font-extrabold text-heading">{label.title}</h2>
        <p className="text-sm text-ink">{label.text}</p>
        <ul className="ml-5 list-disc space-y-1 text-sm text-ink">{r.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
        <p className="text-xs text-muted">Orientación general. En la cotización comparas los planes con tus datos reales.</p>
        <ButtonLink href={`/cotizar/${vehicleType}`} className="w-full">Comparar planes con mi placa</ButtonLink>
      </section>
    </div>
  );
}
