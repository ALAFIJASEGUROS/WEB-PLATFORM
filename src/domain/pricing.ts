// Reglas de precio comunes a todas las aseguradoras.

/** IVA sobre primas de seguros de vehículos en Colombia. */
export const IVA_RATE = 0.19;
/** Recargo de financiación del pago mensual (12 cuotas). */
export const MONTHLY_SURCHARGE = 0.06;

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/** Desglose de una prima anual con IVA incluido: sin IVA, IVA y cuota mensual. */
export function priceBreakdown(annualPremium: number) {
  const netPremium = Math.round(annualPremium / (1 + IVA_RATE));
  return {
    annualPremium,
    netPremium,
    iva: annualPremium - netPremium,
    monthlyPremium: roundTo((annualPremium * (1 + MONTHLY_SURCHARGE)) / 12, 100),
  };
}
