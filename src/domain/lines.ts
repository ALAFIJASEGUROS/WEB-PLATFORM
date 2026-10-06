import type { VehicleType } from "./types";

/**
 * Líneas de seguro de la plataforma. Para habilitar una nueva línea:
 * ver docs/nuevas-lineas.md (cuestionario, modelo de oferta y adaptadores).
 */
export type LineId = VehicleType | "soat" | "hogar" | "viaje";

export interface InsuranceLine {
  id: LineId;
  label: string;
  description: string;
  icon: "car" | "bike" | "file" | "home" | "plane";
  status: "disponible" | "proximamente";
}

export const LINES: InsuranceLine[] = [
  { id: "auto", label: "Carro", description: "Automóviles, camionetas y SUV de uso particular.", icon: "car", status: "disponible" },
  { id: "moto", label: "Moto", description: "Motos de cualquier cilindraje, también para domicilios.", icon: "bike", status: "disponible" },
  { id: "soat", label: "SOAT", description: "Seguro obligatorio para tu carro o moto.", icon: "file", status: "proximamente" },
  { id: "hogar", label: "Hogar", description: "Protege tu vivienda y lo que hay en ella.", icon: "home", status: "proximamente" },
  { id: "viaje", label: "Viaje", description: "Asistencia médica y equipaje en tus viajes.", icon: "plane", status: "proximamente" },
];

export const availableLines = () => LINES.filter((l) => l.status === "disponible");
