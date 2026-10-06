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
 * Contrato que implementa cada integración de aseguradora.
 * Hoy solo existen adaptadores simulados; los reales (API de la aseguradora)
 * deben cumplir la misma interfaz.
 */
export interface InsurerAdapter {
  id: string;
  name: string;
  supports: VehicleType[];
  regulatory: RegulatoryInfo;
  quote(request: QuoteRequest, signal: AbortSignal): Promise<Offer[]>;
  /** Emite la póliza una vez confirmado el pago. Devuelve el número de póliza. */
  issue(request: IssueRequest): Promise<{ policyNumber: string }>;
}

export class InsurerUnavailableError extends Error {}
