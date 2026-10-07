// Lectura de pólizas en PDF: a partir del texto del documento se extraen los
// datos para registrar una póliza externa. El usuario siempre los confirma
// antes de guardar. Solo funciona con PDF que tienen texto (no escaneados).

export interface ParsedPolicy {
  insurerName?: string;
  number?: string;
  planName?: string;
  startDate?: string;
  endDate?: string;
  plate?: string;
  annualPremium?: number;
}

/** Aseguradoras de autos en Colombia y cómo suelen aparecer en sus documentos. */
const INSURERS: [RegExp, string][] = [
  [/seguros\s+sura|suramericana|\bsura\b/i, "SURA"],
  [/seguros\s+bol[ií]var|\bbol[ií]var\b/i, "Seguros Bolívar"],
  [/allianz/i, "Allianz"],
  [/mapfre/i, "Mapfre"],
  [/axa\s+colpatria|colpatria/i, "AXA Colpatria"],
  [/seguros\s+del\s+estado/i, "Seguros del Estado"],
  [/\bhdi\b|liberty\s+seguros/i, "HDI Seguros"],
  [/la\s+previsora|previsora/i, "La Previsora"],
  [/la\s+equidad|equidad\s+seguros/i, "La Equidad"],
  [/seguros\s+mundial|\bmundial\b/i, "Seguros Mundial"],
  [/solidaria/i, "Aseguradora Solidaria"],
  [/\bsbs\b/i, "SBS Seguros"],
  [/zurich/i, "Zurich"],
];

const MONTHS: Record<string, string> = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", setiembre: "09", octubre: "10", noviembre: "11", diciembre: "12",
};

const NOT_PLATES = new Set(["NIT", "IVA", "COP", "SAS", "LTD", "CIA", "TEL", "CEL", "KMS", "USD"]);

const pad = (n: string) => n.padStart(2, "0");

/** Fechas del texto en orden de aparición, normalizadas a ISO. */
export function findDates(text: string): { iso: string; index: number }[] {
  const out: { iso: string; index: number }[] = [];
  const re =
    /\b(\d{4})-(\d{2})-(\d{2})\b|\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b|\b(\d{1,2})\s+de\s+([a-záéíóú]+)\s+(?:de|del)\s+(\d{4})\b/gi;
  for (const m of text.matchAll(re)) {
    let iso: string | undefined;
    if (m[1]) iso = `${m[1]}-${m[2]}-${m[3]}`;
    else if (m[4]) iso = `${m[6]}-${pad(m[5])}-${pad(m[4])}`;
    else if (m[7] && MONTHS[m[8].toLowerCase()]) iso = `${m[9]}-${MONTHS[m[8].toLowerCase()]}-${pad(m[7])}`;
    // Descarta fechas imposibles (p. ej. 31 de febrero): deben ir y volver iguales.
    const valid = iso && !Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) && new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) === iso;
    if (iso && valid) {
      out.push({ iso, index: m.index ?? 0 });
    }
  }
  return out;
}

function parseCop(raw: string) {
  // "1.234.567", "1,234,567" o "1.234.567,00": se quitan los decimales y los separadores.
  const noDecimals = raw.replace(/[.,]\d{2}$/, "");
  const n = Number(noDecimals.replace(/[.,\s]/g, ""));
  return Number.isFinite(n) && n >= 50_000 && n <= 100_000_000 ? n : undefined;
}

export function parsePolicyText(raw: string): ParsedPolicy {
  const text = raw.replace(/\s+/g, " ");
  const out: ParsedPolicy = {};

  out.insurerName = INSURERS.find(([re]) => re.test(text))?.[1];

  const number = text.match(/p[óo]liza\s*(?:n[°ºo]\.?|n[úu]mero|no\.?|#)?\s*[:.-]?\s*([A-Z0-9][A-Z0-9/-]{4,24})/i);
  if (number && /\d/.test(number[1])) out.number = number[1].toUpperCase();

  const plan = text.match(/(?:[Pp]roducto|[Pp]lan|PRODUCTO|PLAN)\s*[:.-]\s*([A-Za-zÁÉÍÓÚáéíóúñÑ0-9 ]{3,40}?)(?=\s+[A-ZÁÉÍÓÚ][a-záéíóú]+\s*:|$)/);
  if (plan) out.planName = plan[1].trim();

  // Vigencia: primero "desde ... hasta ..."; si no, las dos primeras fechas después de "vigencia".
  const dates = findDates(text);
  const desde = text.search(/desde|inicio\s+de\s+vigencia|vigencia/i);
  const after = desde >= 0 ? dates.filter((d) => d.index >= desde) : dates;
  const pair = (after.length >= 2 ? after : dates).slice(0, 2).map((d) => d.iso).sort();
  if (pair.length === 2 && pair[0] < pair[1]) [out.startDate, out.endDate] = pair;

  // Primero la placa rotulada; si no hay, la primera secuencia con forma de placa
  // que no sea una sigla común del documento (NIT 860…, IVA 190…).
  const labeled = text.match(/placa\s*(?:del\s+veh[íi]culo)?\s*[:.-]?\s*([A-Z]{3})\s*-?\s*(\d{2}[A-Z]|\d{3})\b/i);
  const loose = [...text.matchAll(/\b([A-Z]{3})\s?-?(\d{3}|\d{2}[A-Z])\b/g)].find((m) => !NOT_PLATES.has(m[1]));
  const plate = labeled ?? loose;
  if (plate) out.plate = `${plate[1]}${plate[2]}`.toUpperCase();

  const premium = text.match(/(?:prima\s+total|total\s+a\s+pagar|valor\s+total|prima\s+anual|total\s+prima)[^$\d]{0,30}\$?\s*([\d.,]{5,15})/i);
  if (premium) out.annualPremium = parseCop(premium[1]);

  for (const k of Object.keys(out) as (keyof ParsedPolicy)[]) if (out[k] === undefined) delete out[k];
  return out;
}
