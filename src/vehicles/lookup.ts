import type { Vehicle, VehicleType } from "@/domain/types";

// Consulta de vehículo por placa SIMULADA (en producción: RUNT / proveedor
// autorizado y guía de valores Fasecolda).

export const AUTO_PLATE = /^[A-Z]{3}\d{3}$/;
export const MOTO_PLATE = /^[A-Z]{3}\d{2}[A-Z]$/;

export function normalizePlate(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function plateType(plate: string): VehicleType | null {
  if (AUTO_PLATE.test(plate)) return "auto";
  if (MOTO_PLATE.test(plate)) return "moto";
  return null;
}

export const CATALOG: Record<VehicleType, { brand: string; models: { name: string; newValue: number }[] }[]> = {
  auto: [
    { brand: "Chevrolet", models: [{ name: "Onix", newValue: 72_000_000 }, { name: "Tracker", newValue: 105_000_000 }] },
    { brand: "Renault", models: [{ name: "Logan", newValue: 62_000_000 }, { name: "Duster", newValue: 88_000_000 }] },
    { brand: "Mazda", models: [{ name: "Mazda 2", newValue: 85_000_000 }, { name: "CX-30", newValue: 135_000_000 }] },
    { brand: "Toyota", models: [{ name: "Corolla Cross", newValue: 140_000_000 }, { name: "Hilux", newValue: 190_000_000 }] },
    { brand: "Kia", models: [{ name: "Picanto", newValue: 58_000_000 }, { name: "Sportage", newValue: 140_000_000 }] },
    { brand: "Volkswagen", models: [{ name: "T-Cross", newValue: 115_000_000 }, { name: "Polo", newValue: 82_000_000 }] },
  ],
  moto: [
    { brand: "Yamaha", models: [{ name: "NMAX 155", newValue: 15_500_000 }, { name: "MT-03", newValue: 26_000_000 }] },
    { brand: "Honda", models: [{ name: "CB 125F", newValue: 7_800_000 }, { name: "XRE 300", newValue: 21_000_000 }] },
    { brand: "Bajaj", models: [{ name: "Boxer CT 100", newValue: 5_600_000 }, { name: "Pulsar NS 200", newValue: 11_900_000 }] },
    { brand: "AKT", models: [{ name: "NKD 125", newValue: 5_300_000 }, { name: "TT 200", newValue: 8_900_000 }] },
    { brand: "Suzuki", models: [{ name: "Gixxer 150", newValue: 10_500_000 }, { name: "V-Strom 250", newValue: 22_000_000 }] },
  ],
};

export const CURRENT_YEAR = 2026;

/** Depreciación simple: 12% el primer año, 8% anual después, mínimo 25%. */
export function estimateValue(newValue: number, year: number) {
  const age = Math.max(0, CURRENT_YEAR - year);
  const factor = age === 0 ? 1 : 0.88 * Math.pow(0.92, age - 1);
  return Math.round((newValue * Math.max(factor, 0.25)) / 100_000) * 100_000;
}

export function findModel(type: VehicleType, brand: string, model: string) {
  return CATALOG[type]
    .find((b) => b.brand === brand)
    ?.models.find((m) => m.name === model);
}

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function lookupPlate(rawPlate: string): Vehicle | null {
  const plate = normalizePlate(rawPlate);
  const type = plateType(plate);
  if (!type) return null;
  const h = hash(plate);
  const brands = CATALOG[type];
  const b = brands[h % brands.length];
  const m = b.models[(h >> 4) % b.models.length];
  const year = CURRENT_YEAR - ((h >> 8) % 12);
  return {
    type,
    plate,
    brand: b.brand,
    model: m.name,
    year,
    commercialValue: estimateValue(m.newValue, year),
  };
}
