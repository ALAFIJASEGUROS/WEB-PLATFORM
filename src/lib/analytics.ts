"use client";

import type { AnalyticsEvent } from "@/domain/events";
import type { Offer } from "@/domain/types";
import { STATIC_DEMO } from "./api-client";
import { SID_KEY } from "@/recommendation/experiments";

// Analítica propia y anónima: un id aleatorio por pestaña, sin datos personales.
// Para cambiar a PostHog u otro proveedor basta con reemplazar `send`.


function sessionId() {
  try {
    let id = sessionStorage.getItem(SID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SID_KEY, id);
    }
    return id;
  } catch {
    return "sin-sesion";
  }
}

function send(body: string) {
  if (navigator.sendBeacon?.(new URL("/api/eventos", location.origin), body)) return;
  fetch("/api/eventos", { method: "POST", body, keepalive: true }).catch(() => {});
}

export function track(event: AnalyticsEvent, props: Record<string, string | number | boolean> = {}) {
  if (STATIC_DEMO || typeof window === "undefined") return;
  send(JSON.stringify({ event, sid: sessionId(), props }));
}

/** Id de sesión para asociar eventos del servidor (p. ej. el pago) con el embudo. */
export const analyticsSessionId = () => (typeof window === "undefined" ? undefined : sessionId());

/** Reglas de descuento de una oferta, para medir su efecto en la conversión. */
export function discountProps(offer: Pick<Offer, "discounts">): Record<string, string> {
  const ids = offer.discounts?.map((d) => d.ruleId).join(",");
  return ids ? { descuentos: ids.slice(0, 80) } : {};
}
