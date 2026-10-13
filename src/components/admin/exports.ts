import type { AdminSnapshot } from "@/domain/admin";
import { ORDER_STATUS_LABELS } from "@/domain/admin";
import { LEAD_STATUS_LABELS } from "@/domain/leads";
import type { CsvValue } from "@/lib/csv";

// Columnas de las exportaciones a CSV (las usan la ruta del servidor y la demo estática).

export const ORDER_COLUMNS = [
  { key: "reference", label: "Referencia" },
  { key: "createdAt", label: "Fecha (UTC)" },
  { key: "status", label: "Estado" },
  { key: "customer", label: "Cliente" },
  { key: "email", label: "Correo" },
  { key: "insurer", label: "Aseguradora" },
  { key: "plan", label: "Plan" },
  { key: "vehicle", label: "Vehículo" },
  { key: "paymentPlan", label: "Forma de pago" },
  { key: "amount", label: "Monto (COP)" },
  { key: "discount", label: "Descuento (COP)" },
  { key: "marketing", label: "Autoriza marketing" },
];

export function orderCsvRows(orders: AdminSnapshot["orders"]): Record<string, CsvValue>[] {
  return orders.map((o) => ({
    ...o,
    status: ORDER_STATUS_LABELS[o.status],
    consents: undefined,
    marketing: o.consents.find((c) => c.purpose === "marketing")?.granted ? "Sí" : "No",
  }));
}

export const PQR_COLUMNS = [
  { key: "radicado", label: "Radicado" },
  { key: "typeLabel", label: "Tipo" },
  { key: "status", label: "Estado" },
  { key: "dueDate", label: "Vence" },
  { key: "name", label: "Nombre" },
  { key: "email", label: "Correo" },
  { key: "policyNumber", label: "Póliza" },
  { key: "message", label: "Mensaje" },
  { key: "response", label: "Respuesta" },
];

export const EVENT_COLUMNS = [
  { key: "at", label: "Fecha (UTC)" },
  { key: "event", label: "Evento" },
  { key: "sid", label: "Sesión" },
  { key: "props", label: "Propiedades" },
];

export const LEAD_COLUMNS = [
  { key: "createdAt", label: "Fecha (UTC)" },
  { key: "kind", label: "Tipo" },
  { key: "status", label: "Estado" },
  { key: "name", label: "Nombre" },
  { key: "phone", label: "Celular" },
  { key: "email", label: "Correo" },
  { key: "slot", label: "Horario" },
  { key: "summary", label: "Detalle" },
  { key: "notes", label: "Notas" },
];

export const leadCsvRows = (leads: AdminSnapshot["leads"]): Record<string, CsvValue>[] =>
  leads.map((l) => ({ ...l, kind: l.kind === "flota" ? "Flota" : "Llamada", status: LEAD_STATUS_LABELS[l.status] }));
