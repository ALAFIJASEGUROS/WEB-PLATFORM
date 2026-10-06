import type { KycField } from "./adapter";
import { BOLIVAR_CONFIG, SURA_CONFIG } from "./mock/insurers";

// Metadatos públicos de cada aseguradora (sin lógica de tarifas), usables en el
// cliente: por ejemplo, para pintar los campos KYC del checkout.
const CONFIGS = [SURA_CONFIG, BOLIVAR_CONFIG];

export function kycFieldsFor(insurerId: string): KycField[] {
  return CONFIGS.find((c) => c.id === insurerId)?.regulatory.kycFields ?? [];
}

/** Valida respuestas KYC contra los campos que exige la aseguradora. */
export function validateKyc(fields: KycField[], values: Record<string, string | boolean>) {
  const errors: Record<string, string> = {};
  const clean: Record<string, string | boolean> = {};
  for (const f of fields) {
    const v = values[f.key];
    if (v === undefined || v === "") {
      if (f.required) errors[f.key] = "Responde esta pregunta";
      continue;
    }
    if (f.type === "boolean" && typeof v !== "boolean") errors[f.key] = "Respuesta inválida";
    else if (f.type === "select" && !f.options?.some((o) => o.value === v)) errors[f.key] = "Elige una opción";
    else clean[f.key] = v;
  }
  return { ok: Object.keys(errors).length === 0, errors, clean };
}
