"use client";

import { useState } from "react";
import { deductibleSplit, SMMLV_REFERENCE } from "@/domain/calculators";
import { formatCOP } from "@/domain/labels";
import { Field, inputClass } from "@/components/ui";

const num = (v: string) => Math.max(0, Number(v.replace(/\D/g, "")) || 0);
const PRESETS = [0, 5, 10, 20];

/** ¿Cuánto pagaría yo y cuánto la aseguradora en un choque? */
export function DeductibleCalculator() {
  const [damage, setDamage] = useState(4_000_000);
  const [pct, setPct] = useState(10);
  const [minSmmlv, setMinSmmlv] = useState(1);
  const [smmlv, setSmmlv] = useState(SMMLV_REFERENCE.value);
  const r = deductibleSplit(damage, pct, minSmmlv, smmlv);
  const share = damage > 0 ? (r.deductible / damage) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Costo de la reparación" htmlFor="ded-damage" hint={formatCOP(damage)}>
          <input id="ded-damage" inputMode="numeric" className={inputClass} value={damage.toLocaleString("es-CO")} onChange={(e) => setDamage(num(e.target.value))} />
        </Field>
        <Field label="Mínimo en salarios mínimos (SMMLV)" htmlFor="ded-min">
          <select id="ded-min" className={inputClass} value={minSmmlv} onChange={(e) => setMinSmmlv(Number(e.target.value))}>
            {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n === 0 ? "Sin mínimo" : `${n} SMMLV`}</option>)}
          </select>
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-semibold text-heading">Deducible del plan</legend>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <label key={p} className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-2 border-line text-sm font-semibold text-heading has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand">
                <input type="radio" name="ded-pct" className="sr-only" checked={pct === p} onChange={() => setPct(p)} />
                {p}%
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={`Valor del SMMLV`} htmlFor="ded-smmlv" hint={`Referencia ${SMMLV_REFERENCE.year}: ${formatCOP(SMMLV_REFERENCE.value)}. Actualízalo con el valor del año vigente.`}>
          <input id="ded-smmlv" inputMode="numeric" className={inputClass} value={smmlv.toLocaleString("es-CO")} onChange={(e) => setSmmlv(num(e.target.value))} />
        </Field>
      </div>

      <section aria-live="polite" aria-labelledby="ded-result" className="space-y-3 rounded-2xl bg-canvas p-4">
        <h2 id="ded-result" className="sr-only">Resultado</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-sm text-muted">Pagas tú</p>
            <p className="text-2xl font-extrabold text-heading">{formatCOP(r.deductible)}</p>
          </div>
          <div>
            <p className="text-sm text-muted">Paga la aseguradora</p>
            <p className="text-2xl font-extrabold text-heading">{formatCOP(r.insurerPays)}</p>
          </div>
        </div>
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden>
          <div className="rounded-l-full bg-coral" style={{ width: `${share}%` }} />
          <div className="flex-1 rounded-r-full bg-brand-fill" />
        </div>
        <p className="text-sm text-ink">
          {r.insurerPays === 0
            ? "El daño es menor que el deducible: no te conviene reclamar, lo pagarías todo."
            : r.minimumApplies
              ? `Se aplica el mínimo de ${minSmmlv} SMMLV porque el ${pct}% del daño es menor.`
              : `Pagas el ${pct}% del daño.`}
        </p>
      </section>
    </div>
  );
}
