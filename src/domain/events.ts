/** Eventos del embudo de conversión, en orden. */
export const FUNNEL_EVENTS = [
  "cotizacion_iniciada",
  "vehiculo_identificado",
  "cuestionario_completado",
  "resultados_vistos",
  "oferta_elegida",
  "checkout_enviado",
  "pago_aprobado",
] as const;

export const OTHER_EVENTS = ["comparacion_abierta", "detalle_abierto"] as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];
export type AnalyticsEvent = FunnelEvent | (typeof OTHER_EVENTS)[number];

export const FUNNEL_LABELS: Record<FunnelEvent, string> = {
  cotizacion_iniciada: "Inició cotización",
  vehiculo_identificado: "Identificó vehículo",
  cuestionario_completado: "Completó cuestionario",
  resultados_vistos: "Vio resultados",
  oferta_elegida: "Eligió oferta",
  checkout_enviado: "Envió datos y fue a pagar",
  pago_aprobado: "Pago aprobado",
};
