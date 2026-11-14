import type { Offer, QuoteRequest, VehicleType } from "@/domain/types";

export interface IssueRequest {
  offer: Offer;
  quote: QuoteRequest;
  holder: { documentType: string; documentNumber: string; fullName: string };
  kyc: Record<string, string | boolean>;
  startDate: string;
  /** Repetir la emisión con la misma clave devuelve la misma póliza. */
  idempotencyKey: string;
}

/** Figura contractual bajo la que la plataforma comercializa los productos. */
export type ContractModel = "simulado" | "corresponsalia_digital" | "agencia" | "corredor";

/** Campo de conocimiento del cliente (SARLAFT) que exige la aseguradora. */
export interface KycField {
  key: string;
  label: string;
  type: "select" | "boolean";
  options?: { value: string; label: string }[];
  required: boolean;
  help?: string;
}

export interface RegulatoryInfo {
  contractModel: ContractModel;
  /** Campos KYC que deben capturarse antes de emitir. */
  kycFields: KycField[];
}

/**
 * Versión del contrato (SemVer). Un cambio incompatible en esta interfaz sube el
 * número mayor; cada adaptador declara la versión que implementa.
 */
export const ADAPTER_CONTRACT_VERSION = "2.0.0";

/** Resultado de una emisión. `issue` y `getIssueStatus` devuelven el mismo tipo. */
export type IssueResult =
  | { status: "emitida"; policyNumber: string }
  /** La aseguradora recibió la solicitud y emite después (emisión asíncrona). */
  | { status: "pendiente"; externalId: string }
  /** La aseguradora exige inspección del vehículo antes de emitir. */
  | { status: "requiere_inspeccion"; externalId: string; instructions?: string }
  /** Rechazo de suscripción: definitivo, no se reintenta. */
  | { status: "rechazada"; reason: string };

/** Lo que cada aseguradora admite y cómo se comporta su integración. */
export interface AdapterCapabilities {
  /** Minutos que la aseguradora sostiene el precio cotizado. */
  quoteTtlMinutes: number;
  /** La emisión puede quedar `pendiente` y resolverse después. */
  asyncIssue: boolean;
  /** Algunos vehículos requieren inspección antes de emitir. */
  requiresInspection: boolean;
  /** Entrega el documento de la póliza por API. */
  policyDocument: boolean;
  /** Ciudades donde suscribe. Si se omite, todas. */
  cities?: string[];
  /** Modelo (año) más antiguo que asegura. */
  minVehicleYear?: number;
}

export interface PolicyDocument {
  contentType: string;
  /** URL de descarga (puede ser firmada y de corta duración)… */
  url?: string;
  /** …o el contenido del documento. */
  data?: Uint8Array;
  /** Versión del condicionado vigente al emitir. */
  conditionsVersion?: string;
}

export interface HealthStatus {
  ok: boolean;
  latencyMs: number;
  detail?: string;
}

/**
 * Contrato que implementa cada integración de aseguradora.
 * Hoy solo existen adaptadores simulados; los reales (API de la aseguradora)
 * deben cumplir la misma interfaz y pasar los tests de `contract.test.ts`.
 */
export interface InsurerAdapter {
  id: string;
  name: string;
  /** Versión de `ADAPTER_CONTRACT_VERSION` que implementa. */
  contractVersion: string;
  supports: VehicleType[];
  capabilities: AdapterCapabilities;
  regulatory: RegulatoryInfo;
  quote(request: QuoteRequest, signal: AbortSignal): Promise<Offer[]>;
  /**
   * Emite la póliza una vez confirmado el pago. Es idempotente: repetirla con la
   * misma `idempotencyKey` no crea otra póliza y devuelve el estado actual.
   * Lanza `InsurerUnavailableError` ante errores técnicos (se reintenta).
   */
  issue(request: IssueRequest): Promise<IssueResult>;
  /** Estado de una emisión por su clave de idempotencia; `null` si no existe. */
  getIssueStatus(idempotencyKey: string, signal?: AbortSignal): Promise<IssueResult | null>;
  /** Documento de una póliza emitida. Lanza si la póliza no existe. */
  getPolicyDocument(policyNumber: string, signal?: AbortSignal): Promise<PolicyDocument>;
  /** Sonda liviana para el panel de salud. */
  healthcheck?(signal: AbortSignal): Promise<HealthStatus>;
}

/** Error técnico de la aseguradora (red, 5xx, timeout): se puede reintentar. */
export class InsurerUnavailableError extends Error {}

/** Rechazo de suscripción u otro error definitivo: no se reintenta. */
export class InsurerRejectedError extends Error {}

/** Compatibilidad de versiones: mismo número mayor. */
export function isCompatibleContract(version: string, current = ADAPTER_CONTRACT_VERSION) {
  return version.split(".")[0] === current.split(".")[0];
}
