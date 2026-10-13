// Calculadoras públicas: lógica pura, sin datos de la persona.

/**
 * Salario mínimo de referencia para expresar deducibles mínimos. Se actualiza
 * cada año con el decreto del Gobierno; en las calculadoras la persona puede
 * cambiarlo.
 */
export const SMMLV_REFERENCE = { year: 2025, value: 1_423_500 };

/** Cuánto paga cada parte en una pérdida parcial con deducible "% con mínimo en SMMLV". */
export function deductibleSplit(damage: number, pct: number, minSmmlv: number, smmlv = SMMLV_REFERENCE.value) {
  const d = Math.max(0, damage);
  const byPct = (d * Math.max(0, pct)) / 100;
  const minimum = Math.max(0, minSmmlv) * smmlv;
  const deductible = Math.min(d, Math.round(Math.max(byPct, minimum)));
  return { deductible, insurerPays: d - deductible, minimumApplies: minimum > byPct };
}

export type CoverageAdvice = "todo-riesgo" | "rc-perdidas-totales" | "solo-rc";

export const COVERAGE_ADVICE_LABELS: Record<CoverageAdvice, { title: string; text: string }> = {
  "todo-riesgo": {
    title: "Todo riesgo",
    text: "Cubre a terceros, pérdidas totales y daños parciales. Es lo que te protege si no podrías asumir un choque o el robo de tu vehículo.",
  },
  "rc-perdidas-totales": {
    title: "Responsabilidad civil + pérdidas totales",
    text: "Cubre a terceros y te paga si el vehículo se pierde o lo roban. Los daños pequeños los asumes tú, por eso cuesta menos.",
  },
  "solo-rc": {
    title: "Solo responsabilidad civil",
    text: "Cubre los daños que le causes a otros. Tu vehículo no queda cubierto, pero podrías reponerlo con tus ahorros.",
  },
};

export interface CoverageAdviceInput {
  vehicleType: "auto" | "moto";
  /** Valor comercial del vehículo. */
  value: number;
  /** Ahorros que podrías usar para reparar o reponer el vehículo. */
  savings: number;
  financed: boolean;
  /** Si lo usas para trabajar, quedarte sin él te cuesta ingresos. */
  needsItToWork: boolean;
}

/**
 * Orientación general (no es una recomendación de un plan concreto). La
 * responsabilidad civil siempre se recomienda: un accidente con heridos puede
 * costar mucho más que el vehículo.
 */
export function coverageAdvice(i: CoverageAdviceInput): { advice: CoverageAdvice; reasons: string[] } {
  const reasons: string[] = [];
  if (i.financed) {
    reasons.push("Si tu vehículo está financiado, el banco exige cubrir daños y hurto.");
    return { advice: "todo-riesgo", reasons };
  }
  const canReplace = i.savings >= i.value;
  const canRepair = i.savings >= i.value * 0.25;
  if (i.needsItToWork) reasons.push("Lo usas para trabajar: quedarte sin él también te cuesta ingresos.");
  if (!canRepair || (i.needsItToWork && !canReplace)) {
    reasons.push(canRepair ? "Tus ahorros cubren un choque, pero no reponer el vehículo." : "Un choque o un robo se llevaría la mayor parte de tus ahorros.");
    return { advice: "todo-riesgo", reasons };
  }
  if (!canReplace) {
    reasons.push("Podrías pagar un choque pequeño, pero no reponer el vehículo si se pierde o lo roban.");
    return { advice: "rc-perdidas-totales", reasons };
  }
  reasons.push("Con tus ahorros podrías reponer el vehículo; lo que no puedes dejar sin cubrir son los daños a otros.");
  if (i.vehicleType === "moto") reasons.push("En motos el hurto es el riesgo más común: considera al menos cubrir la pérdida total por hurto.");
  return { advice: i.vehicleType === "moto" ? "rc-perdidas-totales" : "solo-rc", reasons };
}
