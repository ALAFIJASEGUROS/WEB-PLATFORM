"use client";

import { useExperimentExposure } from "@/lib/experiments";

/** Registra la exposición a un experimento de interfaz en una página del servidor. */
export function ExperimentExposure({ id }: { id: string }) {
  useExperimentExposure(id);
  return null;
}
