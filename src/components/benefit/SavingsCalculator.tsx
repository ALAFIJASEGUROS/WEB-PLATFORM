"use client";

import { useId, useState } from "react";
import { DEFAULT_TIERS, estimatedSavings, nextTier, tierFor } from "@/domain/companies";
import { formatCOP } from "@/domain/labels";
import { inputClass } from "@/components/ui";

/** Cuánto ahorran la empresa y cada empleado según cuántos se inscriben (tramos simulados). */
export function SavingsCalculator() {
  const id = useId();
  const [employees, setEmployees] = useState(40);
  const [premium, setPremium] = useState(1_600_000);
  const tier = tierFor(employees, DEFAULT_TIERS);
  const next = nextTier(employees, DEFAULT_TIERS);
  const perEmployee = tier ? Math.round(premium * (tier.discountPct / 100)) : 0;
  const total = estimatedSavings(employees, premium, DEFAULT_TIERS);

  return (
    <div className="grid gap-6 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:p-6">
      <div className="space-y-5">
        <div>
          <label htmlFor={`${id}-emp`} className="flex items-baseline justify-between gap-3 text-sm font-semibold text-heading">
            Empleados que se inscriben <span className="text-2xl font-extrabold tabular-nums">{employees}</span>
          </label>
          <input
            id={`${id}-emp`}
            type="range"
            min={1}
            max={200}
            value={employees}
            onChange={(e) => setEmployees(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--color-brand)]"
          />
        </div>
        <div>
          <label htmlFor={`${id}-prem`} className="text-sm font-semibold text-heading">Prima anual promedio por vehículo</label>
          <input
            id={`${id}-prem`}
            type="number"
            min={300_000}
            max={10_000_000}
            step={50_000}
            value={premium}
            onChange={(e) => setPremium(Math.min(10_000_000, Math.max(0, Number(e.target.value) || 0)))}
            className={`${inputClass} mt-2`}
          />
          <p className="mt-1 text-xs text-muted">Un carro mediano en ciudad está entre $1.200.000 y $2.200.000 al año.</p>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl bg-brand-soft p-5" aria-live="polite">
        <p className="text-sm font-semibold text-muted">Tarifa corporativa</p>
        <p className="text-4xl font-extrabold tracking-tight text-heading">{tier ? `${tier.discountPct} %` : "Sin descuento aún"}</p>
        {tier ? (
          <p className="text-sm text-ink">
            Cada empleado ahorra <strong>{formatCOP(perEmployee)}</strong> al año. En total, el equipo ahorra{" "}
            <strong>{formatCOP(total)}</strong>.
          </p>
        ) : (
          <p className="text-sm text-ink">El descuento empieza desde {DEFAULT_TIERS[0].minEmployees} empleados inscritos.</p>
        )}
        {next && (
          <p className="text-sm text-muted">
            Con {next.missing} {next.missing === 1 ? "inscrito más" : "inscritos más"} llegan al {next.tier.discountPct} %.
          </p>
        )}
      </div>
    </div>
  );
}
