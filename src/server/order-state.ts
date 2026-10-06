import type { OrderStatus } from "./db";

/**
 * Transiciones permitidas de una orden. Son monótonas: una orden pagada nunca
 * vuelve a pendiente y una emitida solo puede anularse por retracto. Un pago
 * rechazado sí puede reintentarse, porque la pasarela permite pagar de nuevo
 * con otro medio usando la misma referencia.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pendiente: ["aprobada", "rechazada", "error"],
  rechazada: ["pendiente", "aprobada", "error"],
  aprobada: ["emitida", "error"],
  emitida: ["retractada"],
  retractada: [],
  error: [],
};

export interface StatusChange {
  status: OrderStatus;
  at: string;
  note?: string;
}

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return ORDER_TRANSITIONS[from].includes(to);
}

/**
 * Cambia el estado si la transición es válida y la deja en el historial.
 * Devuelve false (sin lanzar) si no aplica: los eventos de pago pueden llegar
 * repetidos o desordenados y no deben romper el flujo.
 */
export function transition(
  order: { status: OrderStatus; reference: string; history?: StatusChange[] },
  to: OrderStatus,
  note?: string,
) {
  if (order.status === to) return false;
  if (!canTransition(order.status, to)) {
    console.warn(`[órdenes] transición ignorada ${order.reference}: ${order.status} → ${to}`);
    return false;
  }
  order.status = to;
  (order.history ??= []).push({ status: to, at: new Date().toISOString(), ...(note && { note }) });
  return true;
}
