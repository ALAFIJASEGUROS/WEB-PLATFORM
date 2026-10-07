"use client";

import { useEffect, useSyncExternalStore } from "react";
import { UI_EXPERIMENTS } from "@/recommendation/experiments";
import { track } from "./analytics";

const attr = (id: string) => `data-x-${id}`;
const control = (id: string) => UI_EXPERIMENTS.find((e) => e.id === id)?.variants[0].id ?? "control";
const noop = () => () => {};

/**
 * Variante asignada por el script de arranque. En el servidor (y antes de
 * hidratar) devuelve el control; para lo que se pinta en el servidor usa
 * `data-xv` en vez de este hook, así no hay parpadeo.
 */
export function useUiVariant(id: string) {
  return useSyncExternalStore(
    noop,
    () => document.documentElement.getAttribute(attr(id)) ?? control(id),
    () => control(id),
  );
}

/** Registra una vez por sesión que la persona vio el experimento (exposición). */
export function useExperimentExposure(id: string, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const variant = document.documentElement.getAttribute(attr(id));
    if (!variant) return;
    const key = `saf:exp-visto:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* sin almacenamiento: se registra igual */
    }
    track("experimento_visto", { variante: `${id}:${variant}` });
  }, [id, enabled]);
}
