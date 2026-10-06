import type { Offer, QuoteRequest, VehicleType } from "@/domain/types";

export interface IssueRequest {
  offer: Offer;
  quote: QuoteRequest;
  holder: { documentType: string; documentNumber: string; fullName: string };
  startDate: string;
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
  quote(request: QuoteRequest, signal: AbortSignal): Promise<Offer[]>;
  /** Emite la póliza una vez confirmado el pago. Devuelve el número de póliza. */
  issue(request: IssueRequest): Promise<{ policyNumber: string }>;
}

export class InsurerUnavailableError extends Error {}
