import type { Answers, QuoteRequest, VehicleType } from "@/domain/types";
import { estimateValue, findModel } from "@/vehicles/lookup";
import { BOLIVAR_CONFIG, SURA_CONFIG } from "./mock/insurers";
import { priceOffers } from "./mock/tariff";

// Precio de referencia para un vehículo y un perfil típico, sin placa. Usa las
// mismas tarifas que la cotización, así que es un rango orientativo, no una oferta.

export const REFERENCE_ANSWERS: Answers = {
  priority: "equilibrio",
  use: "particular",
  parking: "cerrado",
  mileage: "medio",
  drivers: "solo",
  financed: false,
  deductibleTolerance: "medio",
  services: [],
  claimsLast3Years: 0,
};

export interface EstimateInput {
  type: VehicleType;
  brand: string;
  model: string;
  year: number;
  city: string;
  age: number;
}

export interface PriceEstimate {
  value: number;
  /** Plan más barato (normalmente solo RC). */
  min: number;
  /** Plan más completo disponible. */
  max: number;
  /** Plan con daños y hurto más barato (todo riesgo), si existe. */
  fullFrom: number | null;
  plans: { insurerId: string; insurerName: string; planName: string; annualPremium: number; full: boolean }[];
}

export function estimatePrice(i: EstimateInput, answers: Answers = REFERENCE_ANSWERS): PriceEstimate | null {
  const m = findModel(i.type, i.brand, i.model);
  if (!m) return null;
  const value = estimateValue(m.newValue, i.year);
  const req: QuoteRequest = {
    vehicle: { type: i.type, brand: i.brand, model: i.model, year: i.year, commercialValue: value, ...(m.cc && { engineCc: m.cc }) },
    driver: { birthdate: `${2026 - i.age}-01-15`, city: i.city },
    answers,
  };
  const offers = [SURA_CONFIG, BOLIVAR_CONFIG]
    .flatMap((c) => priceOffers(req, c))
    .filter((o) => !o.maxEngineCc || !m.cc || m.cc <= o.maxEngineCc);
  if (!offers.length) return null;
  const full = (o: (typeof offers)[number]) => o.coverages.perdidaParcialDanos && o.coverages.perdidaTotalHurto;
  const prices = offers.map((o) => o.annualPremium);
  const fulls = offers.filter(full).map((o) => o.annualPremium);
  return {
    value,
    min: Math.min(...prices),
    max: Math.max(...prices),
    fullFrom: fulls.length ? Math.min(...fulls) : null,
    plans: offers
      .map((o) => ({ insurerId: o.insurerId, insurerName: o.insurerName, planName: o.planName, annualPremium: o.annualPremium, full: full(o) }))
      .sort((a, b) => a.annualPremium - b.annualPremium),
  };
}
