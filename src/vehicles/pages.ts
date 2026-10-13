import type { VehicleType } from "@/domain/types";
import { CATALOG } from "./lookup";

// Páginas públicas por marca y línea (/seguros/carro/mazda/mazda-2).

export const TYPE_SLUG: Record<VehicleType, string> = { auto: "carro", moto: "moto" };
export const SLUG_TYPE: Record<string, VehicleType> = { carro: "auto", moto: "moto" };

export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export interface ModelPage {
  type: VehicleType;
  brand: string;
  model: string;
  cc?: number;
  tipo: string;
  marca: string;
  modelo: string;
}

export function modelPages(): ModelPage[] {
  return (Object.keys(CATALOG) as VehicleType[]).flatMap((type) =>
    CATALOG[type].flatMap((b) =>
      b.models.map((m) => ({ type, brand: b.brand, model: m.name, cc: m.cc, tipo: TYPE_SLUG[type], marca: slugify(b.brand), modelo: slugify(m.name) })),
    ),
  );
}

export function findModelPage(tipo: string, marca: string, modelo: string) {
  return modelPages().find((p) => p.tipo === tipo && p.marca === marca && p.modelo === modelo) ?? null;
}

export const modelPath = (p: Pick<ModelPage, "tipo" | "marca" | "modelo">) => `/seguros/${p.tipo}/${p.marca}/${p.modelo}`;
