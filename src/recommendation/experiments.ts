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
  return assignVariantOf(experiment, sid);
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

// ── Experimentos de interfaz (textos y diseño de los llamados a la acción) ──
//
// La variante se decide en el navegador antes de pintar (script en <head>, igual
// que el tema), con el mismo hash por sesión. Las variantes se marcan con
// `data-xv="<experimento>:<variante>"` y el CSS generado oculta las que no
// tocan, así no hay parpadeo ni diferencias entre el HTML del servidor y el
// del cliente. Se activan o desactivan en este archivo (requiere despliegue).

export interface UiExperiment {
  id: string;
  question: string;
  active: boolean;
  /** La primera variante es el control. */
  variants: { id: string; label: string; split: number }[];
}

export const UI_EXPERIMENTS: UiExperiment[] = [
  {
    id: "portada-cta-1",
    question: "¿Empezar escribiendo la placa en la portada aumenta las cotizaciones?",
    active: true,
    variants: [
      { id: "tarjetas", label: "Tarjetas Carro / Moto", split: 50 },
      { id: "placa", label: "Campo de placa en la portada", split: 50 },
    ],
  },
  {
    id: "boton-oferta-1",
    question: "¿Mostrar el precio en el botón de la oferta aumenta las compras?",
    active: true,
    variants: [
      { id: "lo-quiero", label: "«Lo quiero»", split: 50 },
      { id: "comprar-precio", label: "«Comprar por $X»", split: 50 },
    ],
  },
];

/** Asignación genérica (sirve para experimentos de pesos y de interfaz). */
export function assignVariantOf<V extends { id: string; split: number }>(exp: { id: string; variants: V[] }, sid: string): V {
  const b = bucket(`${exp.id}:${sid}`);
  let acc = 0;
  for (const v of exp.variants) {
    acc += v.split;
    if (b < acc) return v;
  }
  return exp.variants[0];
}

export const SID_KEY = "saf:sid";

/**
 * Script que corre antes de pintar: crea el id de sesión anónimo si no existe y
 * marca en <html> la variante de cada experimento activo (data-x-<id>). Debe
 * calcular lo mismo que `assignVariantOf` (hay una prueba que lo verifica).
 */
export function experimentBootScript(experiments: UiExperiment[]) {
  const active = experiments.filter((e) => e.active).map((e) => ({ id: e.id, v: e.variants.map((v) => [v.id, v.split]) }));
  return `(function(){try{var k=${JSON.stringify(SID_KEY)},s=sessionStorage.getItem(k);if(!s){s=(self.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Math.random()).slice(2)+Date.now();sessionStorage.setItem(k,s)}var E=${JSON.stringify(active)};for(var i=0;i<E.length;i++){var e=E[i],x=e.id+":"+s,h=2166136261;for(var j=0;j<x.length;j++){h^=x.charCodeAt(j);h=Math.imul(h,16777619)}var b=(h>>>0)%100,a=0,c=e.v[0][0];for(var n=0;n<e.v.length;n++){a+=e.v[n][1];if(b<a){c=e.v[n][0];break}}document.documentElement.setAttribute("data-x-"+e.id,c)}}catch(_){}})()`;
}

/** CSS que deja visible solo la variante asignada (o el control si no hay asignación). */
export function experimentCss(experiments: UiExperiment[]) {
  return experiments
    .flatMap((e) => {
      const hideOthers = (keep: string) => `[data-xv^="${e.id}:"]:not([data-xv="${e.id}:${keep}"])`;
      return [
        `html:not([data-x-${e.id}]) ${hideOthers(e.variants[0].id)}{display:none!important}`,
        ...e.variants.map((v) => `html[data-x-${e.id}="${v.id}"] ${hideOthers(v.id)}{display:none!important}`),
      ];
    })
    .join("");
}
