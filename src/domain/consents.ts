/**
 * Textos de autorización versionados. Si cambia un texto, se cambia la versión
 * para que la evidencia guarde exactamente lo que la persona aceptó.
 */
export const CONSENTS = {
  terms: {
    version: "terminos-2026-10",
    text: "Leí y acepto los términos y condiciones y el condicionado del seguro. Conozco mi derecho de retracto.",
  },
  dataProcessing: {
    version: "datos-2026-10",
    text: "Autorizo el tratamiento de mis datos personales para cotizar, emitir y administrar mi seguro, y su transferencia a la aseguradora elegida.",
  },
  marketing: {
    version: "marketing-2026-10",
    text: "Quiero recibir ofertas e información de aseguradoras y aliados. Puedo retirarlo cuando quiera.",
  },
} as const;

export type ConsentPurpose = keyof typeof CONSENTS;

export interface ConsentRecord {
  purpose: ConsentPurpose;
  granted: boolean;
  version: string;
  text: string;
  at: string;
  ip?: string;
  userAgent?: string;
  /** Dónde se otorgó o revocó (checkout, perfil, ofertas). */
  source: string;
}

export function consentRecord(
  purpose: ConsentPurpose,
  granted: boolean,
  source: string,
  ctx: { ip?: string; userAgent?: string } = {},
): ConsentRecord {
  return {
    purpose,
    granted,
    version: CONSENTS[purpose].version,
    text: CONSENTS[purpose].text,
    at: new Date().toISOString(),
    ip: ctx.ip,
    userAgent: ctx.userAgent?.slice(0, 200),
    source,
  };
}
