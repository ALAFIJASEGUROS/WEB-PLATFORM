import { ArrowRight, Minus, Plus } from "lucide-react";
import { formatCOP } from "@/domain/labels";
import type { PlanStep } from "@/recommendation/upgrade";

/** "¿Qué ganas con el plan superior?": el costo extra y lo que suma cada salto de plan. */
export function PlanSteps({ steps }: { steps: PlanStep[] }) {
  if (steps.length === 0) return null;
  return (
    <section aria-labelledby="plan-steps" className="mt-8">
      <h2 id="plan-steps" className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
        ¿Qué ganas con el plan superior?
      </h2>
      <div className="space-y-3">
        {steps.map((s) => (
          <div key={`${s.from.id}>${s.to.id}`} className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="flex flex-wrap items-center gap-1.5 font-bold text-heading">
                {s.from.planName} <ArrowRight className="size-4 text-muted" aria-label="a" /> {s.to.planName}
              </p>
              <p className="text-sm tabular-nums">
                <span className="font-extrabold text-heading">+{formatCOP(s.extraAnnual)}</span>
                <span className="text-muted"> al año · +{formatCOP(s.extraMonthly)} al mes</span>
              </p>
            </div>
            <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
              {s.gains.map((g) => (
                <li key={g} className="flex gap-2">
                  <Plus className="mt-0.5 size-4 shrink-0 text-mint" aria-hidden />
                  <span>{g}</span>
                </li>
              ))}
              {s.losses.map((l) => (
                <li key={l} className="flex gap-2 text-muted">
                  <Minus className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>Pierdes: {l}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
