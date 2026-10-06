"use client";

import type { Weights } from "@/domain/types";
import { rebalance } from "@/recommendation/scoring";

const ROWS: { key: keyof Weights; label: string }[] = [
  { key: "price", label: "Precio" },
  { key: "coverage", label: "Cobertura" },
  { key: "services", label: "Servicios" },
];

/** Tres controles que siempre suman 100%. */
export function WeightSliders({ value, onChange }: { value: Weights; onChange: (w: Weights) => void }) {
  return (
    <fieldset className="space-y-4 rounded-2xl bg-canvas p-4">
      <legend className="sr-only">Peso de cada criterio</legend>
      {ROWS.map(({ key, label }) => (
        <div key={key}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <label htmlFor={`w-${key}`} className="font-semibold text-heading">{label}</label>
            <output htmlFor={`w-${key}`} className="font-bold tabular-nums text-brand">{value[key]}%</output>
          </div>
          <input
            id={`w-${key}`}
            type="range"
            min={0}
            max={100}
            step={5}
            value={value[key]}
            onChange={(e) => onChange(rebalance(value, key, Number(e.target.value)))}
            className="h-11 w-full accent-[var(--color-brand)]"
          />
        </div>
      ))}
      <p className="text-xs text-muted">Al mover uno, los otros se ajustan para sumar 100%.</p>
    </fieldset>
  );
}
