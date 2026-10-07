import "server-only";
import { assignmentFor, WEIGHT_EXPERIMENTS, type WeightExperiment } from "@/recommendation/experiments";

// Estado de los experimentos (prendido/apagado) editable desde /admin. En memoria.
const g = globalThis as unknown as { __safExperiments?: Map<string, boolean> };
const overrides = () => (g.__safExperiments ??= new Map());

export function experiments(): WeightExperiment[] {
  return WEIGHT_EXPERIMENTS.map((e) => ({ ...e, active: overrides().get(e.id) ?? e.active }));
}

export function setExperimentActive(id: string, active: boolean) {
  overrides().set(id, active);
}

export const assignmentForSession = (sid: string | undefined) => assignmentFor(sid, experiments());
