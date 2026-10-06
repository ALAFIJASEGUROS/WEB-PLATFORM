import type { CoverageKey, Priority, ServiceKey } from "./types";

export const COVERAGE_LABELS: Record<CoverageKey, string> = {
  rc: "Responsabilidad civil",
  perdidaTotalDanos: "Pérdida total por daños",
  perdidaParcialDanos: "Pérdida parcial por daños",
  perdidaTotalHurto: "Pérdida total por hurto",
  perdidaParcialHurto: "Pérdida parcial por hurto",
  eventosNaturaleza: "Eventos de la naturaleza",
  accidentesPersonales: "Accidentes personales",
};

export const SERVICE_LABELS: Record<ServiceKey, string> = {
  grua: "Grúa 24/7",
  autoSustituto: "Vehículo de reemplazo",
  conductorElegido: "Conductor elegido",
  asistenciaJuridica: "Asistencia jurídica",
  asistenciaViaje: "Asistencia en viaje",
  cerrajeria: "Cerrajería",
  llantas: "Cambio de llantas",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  precio: "Ahorrar en el precio",
  cobertura: "Tener la mayor cobertura",
  servicios: "Servicios y asistencias",
  equilibrio: "Un equilibrio",
};

export const CITIES = [
  "Bogotá",
  "Medellín",
  "Cali",
  "Barranquilla",
  "Cartagena",
  "Bucaramanga",
  "Pereira",
  "Manizales",
  "Santa Marta",
  "Ibagué",
] as const;

export function formatCOP(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatMillions(n: number): string {
  return `$${Math.round(n / 1_000_000).toLocaleString("es-CO")} M`;
}
