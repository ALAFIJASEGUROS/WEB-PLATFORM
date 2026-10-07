"use client";

import { formatCOP } from "@/domain/labels";
import { VALUE_ADJUST_RANGE } from "@/vehicles/lookup";

/** Ajuste del valor asegurado con un control deslizante, explicando su efecto. */
export function InsuredValue({
  estimated,
  value,
  adjust,
  onChange,
}: {
  estimated: number;
  value: number;
  adjust: number;
  onChange: (pct: number) => void;
}) {
  const sign = adjust > 0 ? "+" : "";
  return (
    <div className="space-y-2 rounded-2xl border border-line p-4">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="insured-value" className="text-sm font-semibold text-heading">Valor asegurado</label>
        <p className="text-lg font-extrabold text-heading">{formatCOP(value)}</p>
      </div>
      <input
        id="insured-value"
        type="range"
        min={-VALUE_ADJUST_RANGE}
        max={VALUE_ADJUST_RANGE}
        step={5}
        value={adjust}
        aria-valuetext={`${formatCOP(value)} (${sign}${adjust}% frente al valor de referencia)`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-brand)]"
      />
      <p className="text-xs text-muted">
        Referencia: {formatCOP(estimated)}{adjust !== 0 && ` · ajuste ${sign}${adjust}%`}. Un valor más bajo baja el
        precio, pero si hay pérdida total te pagan sobre ese valor. Cada aseguradora acepta un rango; aquí puedes moverlo
        hasta {VALUE_ADJUST_RANGE}% arriba o abajo.
      </p>
    </div>
  );
}
