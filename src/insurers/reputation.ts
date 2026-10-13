// Calificación de servicio de cada aseguradora a partir de indicadores públicos.
//
// En producción los datos salen de fuentes públicas: el informe de quejas de la
// Superintendencia Financiera (quejas por cada 10.000 pólizas) y las cifras de
// siniestros que reporta Fasecolda. Mientras no estén integradas, los valores
// son SIMULADOS y así se indica en la interfaz.

export interface ReputationIndicators {
  /** Quejas ante la SFC y el defensor por cada 10.000 pólizas de autos. */
  complaintsPer10k: number;
  /** Días promedio entre la reclamación completa y el pago del siniestro. */
  claimPaymentDays: number;
  /** Porcentaje de reclamaciones de autos que terminan pagadas. */
  claimsPaidPct: number;
}

export interface Reputation extends ReputationIndicators {
  insurerId: string;
  /** Calificación de 1 a 5, con un decimal. */
  score: number;
  /** Periodo de los datos, p. ej. "2025". */
  period: string;
  simulated: boolean;
}

/** Fuentes y periodo de los indicadores. */
export const REPUTATION_SOURCE = {
  period: "2025",
  simulated: true,
  sources: [
    "Superintendencia Financiera de Colombia: informe de quejas por entidad",
    "Fasecolda: estadísticas del ramo de automóviles",
  ],
};

const DATA: Record<string, ReputationIndicators> = {
  sura: { complaintsPer10k: 6.8, claimPaymentDays: 9, claimsPaidPct: 91 },
  bolivar: { complaintsPer10k: 8.9, claimPaymentDays: 12, claimsPaidPct: 88 },
};

/** Lleva un valor a la escala 1–5 entre un extremo "malo" y uno "bueno". */
function scale(value: number, bad: number, good: number) {
  const t = (value - bad) / (good - bad);
  return 1 + 4 * Math.max(0, Math.min(1, t));
}

/** Promedio de los tres indicadores llevados a 1–5 con umbrales fijos y públicos. */
export function reputationScore(i: ReputationIndicators) {
  const parts = [scale(i.complaintsPer10k, 20, 2), scale(i.claimPaymentDays, 30, 5), scale(i.claimsPaidPct, 70, 97)];
  return Math.round((parts.reduce((s, n) => s + n, 0) / parts.length) * 10) / 10;
}

export const SCORE_THRESHOLDS = [
  { label: "Quejas por cada 10.000 pólizas", bad: "20 o más", good: "2 o menos" },
  { label: "Días para pagar un siniestro", bad: "30 o más", good: "5 o menos" },
  { label: "Reclamaciones pagadas", bad: "70% o menos", good: "97% o más" },
];

export function reputationFor(insurerId: string): Reputation | null {
  const d = DATA[insurerId];
  if (!d) return null;
  return { insurerId, ...d, score: reputationScore(d), period: REPUTATION_SOURCE.period, simulated: REPUTATION_SOURCE.simulated };
}

export const formatScore = (n: number) => n.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
