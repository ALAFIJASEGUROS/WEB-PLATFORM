import "server-only";
import { db } from "./db";
import { applyPaymentUpdate, processIssuanceQueue } from "./orders";
import { providerById } from "./payments";

/** Tiempo tras el cual un pago pendiente se considera atascado. */
const STALE_MS = 30 * 60 * 1000;

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

const g = globalThis as unknown as { __safReconciliation?: ReconciliationReport };
export const lastReconciliation = () => g.__safReconciliation ?? null;

/**
 * Compara el estado local de órdenes y cuotas con la pasarela. Si hay un id de
 * transacción, consulta su estado y lo aplica (idempotente); lo que no se puede
 * resolver solo queda en el reporte para revisión manual.
 */
export async function reconcilePayments(now = Date.now()): Promise<ReconciliationReport> {
  const d = db();
  const issues: ReconciliationIssue[] = [];
  let checked = 0;
  // Primero se reintentan las emisiones que ya les toca.
  let { processed: updated } = await processIssuanceQueue(now);

  for (const order of d.orders.values()) {
    checked++;
    const age = now - new Date(order.createdAt).getTime();
    if (order.status === "pendiente") {
      // Se consulta la pasarela con la que se creó el cobro, no la predeterminada.
      const provider = providerById(order.provider);
      if (order.providerTransactionId && provider?.fetchTransaction) {
        const tx = await provider.fetchTransaction(order.providerTransactionId);
        if (tx && tx.reference === order.reference && tx.status !== "PENDING") {
          await applyPaymentUpdate(tx);
          updated++;
          continue;
        }
      }
      if (age > STALE_MS) {
        issues.push(
          order.acceptance?.acceptedAt
            ? { reference: order.reference, kind: "pago_pendiente", detail: "Pago sin confirmación de la pasarela hace más de 30 minutos." }
            : { reference: order.reference, kind: "sin_aceptacion", detail: "El tomador no aceptó las condiciones; no llegó a pagar." },
        );
      }
    } else if (order.status === "aprobada" && !order.policyId) {
      const job = d.issuanceJobs.get(order.id);
      issues.push(
        job?.status === "pendiente"
          ? { reference: order.reference, kind: "emision_en_reintento", detail: `Emisión en reintento (${job.attempts} intentos). Último error: ${job.lastError ?? "—"}` }
          : { reference: order.reference, kind: "aprobada_sin_poliza", detail: "Pago aprobado sin póliza emitida." },
      );
    } else if (order.status === "error") {
      issues.push({ reference: order.reference, kind: "error_emision", detail: "Error al emitir o monto no coincide. Revisar y reembolsar si aplica." });
    }
  }

  for (const attempt of d.installmentPayments.values()) {
    checked++;
    if (attempt.status === "pendiente" && now - attempt.createdAt > STALE_MS) {
      issues.push({ reference: attempt.reference, kind: "cuota_pendiente", detail: `Cuota ${attempt.n} sin confirmación hace más de 30 minutos.` });
    }
  }

  const report = { at: new Date(now).toISOString(), checked, updated, issues };
  g.__safReconciliation = report;
  return report;
}
