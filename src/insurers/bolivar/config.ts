// Configuración de la integración con Seguros Bolívar por variables de entorno.
//
// INSURER_BOLIVAR_MODE=mock     → aseguradora simulada (por defecto)
// INSURER_BOLIVAR_MODE=sandbox  → API de pruebas de Bolívar
// INSURER_BOLIVAR_MODE=prod     → API de producción (pólizas reales)

import type { ContractModel } from "../adapter";

export type BolivarMode = "mock" | "sandbox" | "prod";
const CONTRACT_MODELS: ContractModel[] = ["corresponsalia_digital", "agencia", "corredor"];

export interface BolivarConfig {
  mode: BolivarMode;
  baseUrl?: string;
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  /** Código de intermediario asignado en el convenio. */
  intermediaryCode?: string;
  /** Figura bajo la que se comercializa (HU-14.1). Por defecto, agencia. */
  contractModel: ContractModel;
  quoteTimeoutMs: number;
}

export function bolivarConfig(env: Record<string, string | undefined> = process.env): BolivarConfig {
  const raw = env.INSURER_BOLIVAR_MODE?.trim().toLowerCase();
  const mode: BolivarMode = raw === "sandbox" || raw === "prod" ? raw : "mock";
  return {
    mode,
    baseUrl: env.BOLIVAR_API_URL?.replace(/\/+$/, "") || undefined,
    tokenUrl: env.BOLIVAR_TOKEN_URL || undefined,
    clientId: env.BOLIVAR_CLIENT_ID || undefined,
    clientSecret: env.BOLIVAR_CLIENT_SECRET || undefined,
    intermediaryCode: env.BOLIVAR_INTERMEDIARY_CODE || undefined,
    contractModel: CONTRACT_MODELS.find((m) => m === env.BOLIVAR_CONTRACT_MODEL) ?? "agencia",
    quoteTimeoutMs: Number(env.BOLIVAR_QUOTE_TIMEOUT_MS) || 6000,
  };
}

/** Variables que faltan para usar la API real. Vacío si está completa o en modo mock. */
export function missingConfig(c: BolivarConfig): string[] {
  if (c.mode === "mock") return [];
  const required: [string, string | undefined][] = [
    ["BOLIVAR_API_URL", c.baseUrl],
    ["BOLIVAR_TOKEN_URL", c.tokenUrl],
    ["BOLIVAR_CLIENT_ID", c.clientId],
    ["BOLIVAR_CLIENT_SECRET", c.clientSecret],
    ["BOLIVAR_INTERMEDIARY_CODE", c.intermediaryCode],
  ];
  return required.filter(([, v]) => !v).map(([k]) => k);
}
