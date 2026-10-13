"use client";

import { useState } from "react";
import type { VehicleType } from "@/domain/types";
import { CITIES, formatCOP } from "@/domain/labels";
import { CATALOG, CURRENT_YEAR } from "@/vehicles/lookup";
import { estimatePrice } from "@/insurers/estimate";
import { ButtonLink, Field, inputClass } from "@/components/ui";

const YEARS = Array.from({ length: 16 }, (_, i) => CURRENT_YEAR - i);

/** "¿Cuánto cuesta asegurar mi carro o moto?" con un perfil típico, sin placa. */
export function PriceCalculator({ initialType = "auto" }: { initialType?: VehicleType }) {
  const [type, setType] = useState<VehicleType>(initialType);
  const [brand, setBrand] = useState(CATALOG[initialType][0].brand);
  const [model, setModel] = useState(CATALOG[initialType][0].models[0].name);
  const [year, setYear] = useState(CURRENT_YEAR - 3);
  const [city, setCity] = useState<string>("Bogotá");
  const [age, setAge] = useState(35);
  const models = CATALOG[type].find((b) => b.brand === brand)?.models ?? [];
  const estimate = estimatePrice({ type, brand, model, year, city, age });
  const noun = type === "auto" ? "carro" : "moto";

  function changeType(t: VehicleType) {
    setType(t);
    setBrand(CATALOG[t][0].brand);
    setModel(CATALOG[t][0].models[0].name);
  }
  function changeBrand(b: string) {
    setBrand(b);
    setModel(CATALOG[type].find((x) => x.brand === b)!.models[0].name);
  }

  return (
    <div className="space-y-5">
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="mb-2 text-sm font-semibold text-heading">Vehículo</legend>
        {(["auto", "moto"] as const).map((t) => (
          <label key={t} className="flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border-2 border-line font-semibold text-heading has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand">
            <input type="radio" name="calc-type" className="sr-only" checked={type === t} onChange={() => changeType(t)} />
            {t === "auto" ? "Carro" : "Moto"}
          </label>
        ))}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Marca" htmlFor="calc-brand">
          <select id="calc-brand" className={inputClass} value={brand} onChange={(e) => changeBrand(e.target.value)}>
            {CATALOG[type].map((b) => <option key={b.brand}>{b.brand}</option>)}
          </select>
        </Field>
        <Field label="Línea" htmlFor="calc-model">
          <select id="calc-model" className={inputClass} value={model} onChange={(e) => setModel(e.target.value)}>
            {models.map((m) => <option key={m.name}>{m.name}</option>)}
          </select>
        </Field>
        <Field label="Año (modelo)" htmlFor="calc-year">
          <select id="calc-year" className={inputClass} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {YEARS.map((y) => <option key={y}>{y}</option>)}
          </select>
        </Field>
        <Field label="Ciudad donde circula" htmlFor="calc-city">
          <select id="calc-city" className={inputClass} value={city} onChange={(e) => setCity(e.target.value)}>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label={`Edad de quien maneja: ${age} años`} htmlFor="calc-age">
          <input id="calc-age" type="range" min={18} max={75} value={age} onChange={(e) => setAge(Number(e.target.value))} className="h-11 w-full accent-[var(--color-brand)]" />
        </Field>
      </div>

      {estimate && (
        <section aria-live="polite" aria-labelledby="calc-result" className="space-y-3 rounded-2xl bg-canvas p-4">
          <h2 id="calc-result" className="text-sm font-semibold text-muted">Precio de referencia al año</h2>
          <p className="text-2xl font-extrabold tracking-tight text-heading">
            {formatCOP(estimate.min)} a {formatCOP(estimate.max)}
          </p>
          {estimate.fullFrom && <p className="text-sm text-ink">Todo riesgo desde <strong>{formatCOP(estimate.fullFrom)}</strong>. Valor de referencia del {noun}: {formatCOP(estimate.value)}.</p>}
          <ul className="divide-y divide-line text-sm">
            {estimate.plans.map((p) => (
              <li key={`${p.insurerId}-${p.planName}`} className="flex justify-between gap-3 py-2">
                <span>{p.planName} · <span className="text-muted">{p.insurerName}</span>{p.full && <span className="ml-1 text-xs font-semibold text-mint">todo riesgo</span>}</span>
                <span className="font-semibold tabular-nums">{formatCOP(p.annualPremium)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            Para un perfil típico: uso personal, parqueadero cerrado, sin siniestros. Tu precio real depende de tu placa y tus respuestas. Precios simulados.
          </p>
          <ButtonLink href={`/cotizar/${type}`} className="w-full">Ver mi precio exacto</ButtonLink>
        </section>
      )}
    </div>
  );
}
