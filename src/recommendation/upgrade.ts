// "¿Qué ganas con el plan superior?": diferencias entre planes consecutivos de
// una misma aseguradora, ordenados por precio. Sirve cuando hay pocos planes y
// la decisión es subir o no de plan, más que elegir entre muchas opciones.
import { COVERAGE_KEYS, type Offer } from "@/domain/types";
import { COVERAGE_LABELS, formatMillions, SERVICE_LABELS } from "@/domain/labels";

export interface PlanStep {
  from: Offer;
  to: Offer;
  extraAnnual: number;
  extraMonthly: number;
  /** Lo que se gana al subir de plan, en lenguaje de usuario. */
  gains: string[];
  /** Lo que se pierde (raro, pero pasa con deducibles o asistencias). */
  losses: string[];
}

/** Máximo de planes por aseguradora para mostrar la escalera; con más, se usa el comparador. */
export const MAX_PLANS_FOR_STEPS = 4;

const deductible = (o: Offer) =>
  o.deductiblePct === 0 ? "sin deducible" : `${o.deductiblePct} % (mín. ${o.deductibleMinSmmlv} SMMLV)`;

export function compareStep(from: Offer, to: Offer): PlanStep {
  const gains: string[] = [];
  const losses: string[] = [];
  for (const k of COVERAGE_KEYS) {
    if (to.coverages[k] && !from.coverages[k]) gains.push(COVERAGE_LABELS[k]);
    if (!to.coverages[k] && from.coverages[k]) losses.push(COVERAGE_LABELS[k]);
  }
  if (to.rcLimit > from.rcLimit) gains.push(`Responsabilidad civil de ${formatMillions(from.rcLimit)} a ${formatMillions(to.rcLimit)}`);
  if (to.rcLimit < from.rcLimit) losses.push(`Responsabilidad civil de ${formatMillions(from.rcLimit)} a ${formatMillions(to.rcLimit)}`);

  const fromDed = [from.deductiblePct, from.deductibleMinSmmlv];
  const toDed = [to.deductiblePct, to.deductibleMinSmmlv];
  if (toDed[0] < fromDed[0] || (toDed[0] === fromDed[0] && toDed[1] < fromDed[1])) {
    gains.push(`Deducible de ${deductible(from)} a ${deductible(to)}`);
  } else if (toDed[0] > fromDed[0] || (toDed[0] === fromDed[0] && toDed[1] > fromDed[1])) {
    losses.push(`Deducible de ${deductible(from)} a ${deductible(to)}`);
  }

  for (const s of to.services) {
    if (!from.services.includes(s)) {
      gains.push(s === "autoSustituto" ? `${SERVICE_LABELS[s]} (${to.substituteCarDays} días)` : SERVICE_LABELS[s]);
    }
  }
  for (const s of from.services) if (!to.services.includes(s)) losses.push(SERVICE_LABELS[s]);
  if (from.services.includes("autoSustituto") && to.services.includes("autoSustituto") && to.substituteCarDays > from.substituteCarDays) {
    gains.push(`Vehículo de reemplazo de ${from.substituteCarDays} a ${to.substituteCarDays} días`);
  }

  return {
    from,
    to,
    extraAnnual: to.annualPremium - from.annualPremium,
    extraMonthly: to.monthlyPremium - from.monthlyPremium,
    gains,
    losses,
  };
}

/**
 * Escalones entre planes consecutivos (por precio) de cada aseguradora. Solo
 * aplica si la aseguradora tiene entre 2 y `MAX_PLANS_FOR_STEPS` planes.
 */
export function planSteps(offers: Offer[]): PlanStep[] {
  const byInsurer = new Map<string, Offer[]>();
  for (const o of offers) byInsurer.set(o.insurerId, [...(byInsurer.get(o.insurerId) ?? []), o]);
  const steps: PlanStep[] = [];
  for (const plans of byInsurer.values()) {
    if (plans.length < 2 || plans.length > MAX_PLANS_FOR_STEPS) continue;
    const sorted = [...plans].sort((a, b) => a.annualPremium - b.annualPremium);
    for (let i = 1; i < sorted.length; i++) {
      const step = compareStep(sorted[i - 1], sorted[i]);
      if (step.gains.length > 0) steps.push(step);
    }
  }
  return steps;
}
