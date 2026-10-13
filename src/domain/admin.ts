// Tipos del panel de administración. Viven fuera de src/server para que los
// componentes de presentación los usen también en la demo estática.

import type { DiscountRule, DiscountSettings } from "./discounts";
import type { FunnelEvent } from "./events";

export type OrderStatus = "pendiente" | "aprobada" | "rechazada" | "emitida" | "retractada" | "error" | "reembolsada";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente: "Pendiente",
  aprobada: "Pagada, emitiendo",
  rechazada: "Rechazada",
  emitida: "Emitida",
  retractada: "Retractada",
  error: "Error",
  reembolsada: "Reembolsada",
};

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
}

export type IssueKind =
  | "pago_pendiente"
  | "sin_aceptacion"
  | "aprobada_sin_poliza"
  | "error_emision"
  | "emision_en_reintento"
  | "cuota_pendiente";

export interface ReconciliationIssue {
  reference: string;
  kind: IssueKind;
  detail: string;
}

export interface ReconciliationReport {
  at: string;
  checked: number;
  updated: number;
  issues: ReconciliationIssue[];
}

export interface VariantResult {
  variantId: string;
  label: string;
  exposed: number;
  started: number;
  chose: number;
  choseRecommended: number;
  checkout: number;
  paid: number;
  /** Compras / sesiones expuestas. */
  conversion: number | null;
  /** Valor p (dos colas) de la conversión frente al control; null si no aplica. */
  pValue: number | null;
}

export interface DiscountImpactRow {
  key: string;
  label: string;
  source?: "aseguradora" | "plataforma";
  chosen: number;
  orders: number;
  paid: number;
  /** Pagadas / elegidas. */
  conversion: number | null;
  /** Descuento otorgado en compras pagadas (COP). */
  granted: number;
  /** Prima anual cobrada en compras pagadas (COP). */
  premium: number;
}

export interface AdminOrderRow {
  id: string;
  reference: string;
  createdAt: string;
  customer: string;
  email: string;
  plan: string;
  insurer: string;
  vehicle: string;
  amount: number;
  paymentPlan: "anual" | "mensual";
  discount: number;
  status: OrderStatus;
  consents: { purpose: string; granted: boolean; title: string }[];
}

export interface DailySales {
  /** Fecha ISO (hora Colombia). */
  date: string;
  orders: number;
  issued: number;
  /** Recaudo de las pólizas emitidas ese día (COP). */
  revenue: number;
}

export interface AdminLeadRow {
  id: string;
  kind: "llamada" | "flota";
  createdAt: string;
  name: string;
  phone: string;
  email?: string;
  slot: string;
  status: "nueva" | "contactada" | "vendida" | "perdida";
  summary: string;
  notes?: string;
}

/** Todo lo que muestra el panel, en un objeto serializable. */
export interface AdminSnapshot {
  generatedAt: string;
  kpis: { orders: number; issued: number; revenue: number; users: number };
  byInsurer: [string, number][];
  salesByDay: DailySales[];
  funnel: { step: FunnelEvent; sessions: number; fromPrevious: number | null }[];
  chosenByInsurer: [string, number][];
  orders: AdminOrderRow[];
  reconciliation: ReconciliationReport | null;
  discounts: { settings: DiscountSettings; rules: DiscountRule[]; impact: DiscountImpactRow[] };
  experiments: { id: string; question: string; kind: "pesos" | "interfaz"; active: boolean; rows: VariantResult[] }[];
  campaigns: { id: string; title: string; sponsor: string; audience: string; active: boolean }[];
  pqrs: {
    id: string;
    radicado: string;
    type: string;
    typeLabel: string;
    name: string;
    email: string;
    policyNumber?: string;
    message: string;
    dueDate: string;
    status: "radicada" | "en_tramite" | "respondida";
    response?: string;
  }[];
  leads: AdminLeadRow[];
  savedQuotes: { saved: number; reminded: number; converted: number };
  outbox: { id: string; to: string; channel: string; subject: string; body: string; createdAt: string }[];
  audit: AuditEntry[];
}
