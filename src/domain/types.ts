// Modelo canónico del dominio. Todas las aseguradoras se normalizan a estos tipos.

export type VehicleType = "auto" | "moto";

export interface Vehicle {
  type: VehicleType;
  plate?: string;
  brand: string;
  model: string;
  year: number;
  /** Valor comercial estimado en COP. */
  commercialValue: number;
}

export type Priority = "precio" | "cobertura" | "servicios" | "equilibrio";
export type VehicleUse = "particular" | "trabajo" | "domicilios";
export type Parking = "cerrado" | "calle";
export type DeductibleTolerance = "bajo" | "medio" | "alto";
export type Mileage = "bajo" | "medio" | "alto";
export type Drivers = "solo" | "varios";

export const COVERAGE_KEYS = [
  "rc",
  "perdidaTotalDanos",
  "perdidaParcialDanos",
  "perdidaTotalHurto",
  "perdidaParcialHurto",
  "eventosNaturaleza",
  "accidentesPersonales",
] as const;
export type CoverageKey = (typeof COVERAGE_KEYS)[number];

export const SERVICE_KEYS = [
  "grua",
  "autoSustituto",
  "conductorElegido",
  "asistenciaJuridica",
  "asistenciaViaje",
  "cerrajeria",
  "llantas",
] as const;
export type ServiceKey = (typeof SERVICE_KEYS)[number];

/** Respuestas del cuestionario de recomendación. */
export interface Answers {
  priority: Priority;
  use: VehicleUse;
  parking: Parking;
  /** Kilómetros al mes: bajo < 500, medio 500–1.500, alto > 1.500. */
  mileage: Mileage;
  /** Si el vehículo lo maneja solo el tomador o varias personas. */
  drivers: Drivers;
  financed: boolean;
  deductibleTolerance: DeductibleTolerance;
  services: ServiceKey[];
  claimsLast3Years: number;
  /** Pesos personalizados (enteros que suman 100). Si no vienen, se usan los de la prioridad. */
  weights?: Weights;
}

export interface Weights {
  price: number;
  coverage: number;
  services: number;
}

export interface Driver {
  birthdate: string; // ISO yyyy-mm-dd
  city: string;
}

export interface QuoteRequest {
  vehicle: Vehicle;
  driver: Driver;
  answers: Answers;
}

/** Oferta normalizada que devuelve cualquier adaptador de aseguradora. */
export interface Offer {
  id: string;
  insurerId: string;
  insurerName: string;
  planName: string;
  vehicleType: VehicleType;
  annualPremium: number;
  monthlyPremium: number;
  /** Límite de responsabilidad civil en COP. */
  rcLimit: number;
  coverages: Record<CoverageKey, boolean>;
  /** Deducible como porcentaje de la pérdida. */
  deductiblePct: number;
  /** Deducible mínimo en SMMLV. */
  deductibleMinSmmlv: number;
  services: ServiceKey[];
  substituteCarDays: number;
  /** Prima anual sin IVA y valor del IVA (19%). annualPremium = net + iva. */
  netPremium: number;
  iva: number;
  /** Principales exclusiones del plan. */
  exclusions: string[];
  /** Ruta al condicionado del plan. */
  conditionsUrl: string;
  /** Fecha ISO hasta la que el precio es válido. */
  validUntil: string;
}

export interface ScoredOffer extends Offer {
  score: number; // 0..100
  subscores: { price: number; coverage: number; services: number };
  reasons: string[];
  warnings: string[];
  labels: OfferLabel[];
}

export type OfferLabel = "recomendado" | "menorPrecio" | "mayorCobertura";

export interface InsurerError {
  insurerId: string;
  insurerName: string;
  message: string;
}

export interface QuoteResponse {
  quoteId: string;
  offers: ScoredOffer[];
  errors: InsurerError[];
}
