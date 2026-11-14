import "server-only";
import type { PolicyDocument } from "@/insurers/adapter";
import { getAdapter } from "@/insurers/aggregator";
import { getPolicyForViewer } from "./orders";

export type PolicyDocumentResult =
  | { ok: true; document: PolicyDocument; policyNumber: string }
  | { ok: false; status: 404 | 409 | 502; error: string };

/**
 * Documento de la póliza emitido por la aseguradora. Aplica la misma regla de
 * acceso que la página de la póliza: enlace con token o dueño con sesión.
 */
export async function policyDocumentFor(id: string, token?: string, userId?: string): Promise<PolicyDocumentResult> {
  const policy = getPolicyForViewer(id, token, userId);
  if (!policy) return { ok: false, status: 404, error: "Póliza no encontrada." };
  const adapter = policy.source === "compra" ? getAdapter(policy.insurerId) : undefined;
  if (!adapter?.capabilities.policyDocument) {
    return { ok: false, status: 409, error: "La aseguradora no entrega el documento por este medio." };
  }
  try {
    const document = await adapter.getPolicyDocument(policy.number, AbortSignal.timeout(10_000));
    return { ok: true, document, policyNumber: policy.number };
  } catch (e) {
    console.error(`[documento] ${policy.insurerId} ${policy.number}: ${e instanceof Error ? e.message : e}`);
    return { ok: false, status: 502, error: `${adapter.name} no entregó el documento. Intenta más tarde.` };
  }
}

/** ¿Muestra la página de la póliza el enlace al documento de la aseguradora? */
export function hasInsurerDocument(policy: { source?: string; insurerId: string }) {
  return policy.source === "compra" && !!getAdapter(policy.insurerId)?.capabilities.policyDocument;
}
