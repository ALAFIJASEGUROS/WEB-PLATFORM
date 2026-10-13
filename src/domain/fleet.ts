import type { VehicleType } from "./types";
import { normalizePlate, plateType } from "@/vehicles/lookup";

// Cotización de flotas: varias placas de una empresa (mensajería, domicilios,
// vehículos de empleados) en una sola solicitud.

export const MAX_FLEET = 30;

export interface ParsedPlates {
  plates: { plate: string; type: VehicleType }[];
  invalid: string[];
  duplicates: string[];
  tooMany: boolean;
}

/** Acepta placas separadas por comas, espacios o saltos de línea. */
export function parsePlates(text: string): ParsedPlates {
  const seen = new Set<string>();
  const out: ParsedPlates = { plates: [], invalid: [], duplicates: [], tooMany: false };
  for (const token of text.split(/[\s,;]+/).filter(Boolean)) {
    const plate = normalizePlate(token);
    const type = plateType(plate);
    if (!type) out.invalid.push(token.slice(0, 12));
    else if (seen.has(plate)) out.duplicates.push(plate);
    else if (out.plates.length >= MAX_FLEET) out.tooMany = true;
    else {
      seen.add(plate);
      out.plates.push({ plate, type });
    }
  }
  return out;
}

export interface FleetLine {
  plate: string;
  vehicle: string;
  type: VehicleType;
  best?: { insurerName: string; planName: string; annualPremium: number };
  error?: string;
}

export function summarizeFleet(lines: FleetLine[]) {
  const quoted = lines.filter((l) => l.best);
  return {
    vehicles: lines.length,
    quoted: quoted.length,
    autos: lines.filter((l) => l.type === "auto").length,
    motos: lines.filter((l) => l.type === "moto").length,
    total: quoted.reduce((s, l) => s + l.best!.annualPremium, 0),
  };
}
