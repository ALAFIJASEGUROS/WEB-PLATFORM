// Experimentos A/B de pesos del recomendador.
//
// Guardarraíles: un experimento solo cambia los pesos de una prioridad (cómo se
// ordena), nunca la elegibilidad ni el precio, y la comisión nunca es un
// factor. Si la persona ajustó sus propios pesos, el experimento no la toca.

import type { Priority } from "@/domain/types";

export interface PriorityWeights {
  price: number;
  coverage: number;
  services: number;
}

export interface ExperimentVariant {
  id: string;
  label: string;
  /** Porcentaje del tráfico (las variantes de un experimento suman 100). */
  split: number;
  /** Pesos que reemplazan a los de la prioridad. Sin esto es el control. */
  priorityWeights?: Partial<Record<Priority, PriorityWeights>>;
}

export interface WeightExperiment {
  id: string;
  question: string;
  /** Activo por defecto; en el servidor se puede prender y apagar desde /admin. */
  active: boolean;
  variants: ExperimentVariant[];
}

export const WEIGHT_EXPERIMENTS: WeightExperiment[] = [
  {
    id: "pesos-equilibrio-1",
    question: "En la prioridad «Un equilibrio», ¿dar más peso al precio aumenta las compras?",
    active: true,
    variants: [
      { id: "control", label: "Actual: precio 40 · cobertura 40 · servicios 20", split: 50 },
      {
        id: "mas-precio",
        label: "Precio 50 · cobertura 30 · servicios 20",
        split: 50,
        priorityWeights: { equilibrio: { price: 0.5, coverage: 0.3, services: 0.2 } },
      },
    ],
  },
];

export interface Assignment {
  experimentId: string;
  variantId: string;
  priorityWeights?: ExperimentVariant["priorityWeights"];
}

/** Hash estable (FNV-1a) a un número 0–99: la misma sesión siempre cae en la misma variante. */
function bucket(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100;
}

export function assignVariant(experiment: WeightExperiment, sid: string): ExperimentVariant {
  const b = bucket(`${experiment.id}:${sid}`);
  let acc = 0;
  for (const v of experiment.variants) {
    acc += v.split;
    if (b < acc) return v;
  }
  return experiment.variants[0];
}

/** Asignación del primer experimento activo, o null si no hay ninguno o no hay sesión. */
export function assignmentFor(sid: string | undefined, experiments: WeightExperiment[]): Assignment | null {
  const exp = experiments.find((e) => e.active);
  if (!sid || !exp) return null;
  const v = assignVariant(exp, sid);
  return { experimentId: exp.id, variantId: v.id, priorityWeights: v.priorityWeights };
}

/** Etiqueta "experimento:variante" que viaja en los eventos de analítica. */
export const assignmentTag = (a: Pick<Assignment, "experimentId" | "variantId">) => `${a.experimentId}:${a.variantId}`;
