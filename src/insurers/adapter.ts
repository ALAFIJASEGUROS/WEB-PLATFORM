import type { Offer, QuoteRequest, VehicleType } from "@/domain/types";

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
}

export class InsurerUnavailableError extends Error {}
