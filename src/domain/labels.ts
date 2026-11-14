import type { CoverageKey, Priority, ServiceKey, VehicleUse } from "./types";

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

/** Uso del vehículo, redactado para completar "uso …". */
export const USE_LABELS: Record<VehicleUse, string> = {
  particular: "personal o familiar",
  trabajo: "para trabajo",
  domicilios: "en domicilios o plataformas",
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

/** "Mazda 2" en vez de "Mazda Mazda 2" cuando la línea ya trae la marca. */
export const vehicleName = (brand: string, model: string) =>
  model.toLowerCase().startsWith(brand.toLowerCase()) ? model : `${brand} ${model}`;

/** Fecha corta en español a partir de una fecha ISO (aaaa-mm-dd): "29 de noviembre". */
export function formatDayMonth(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "UTC" }).format(d);
}

export function formatMillions(n: number): string {
  return `$${Math.round(n / 1_000_000).toLocaleString("es-CO")} M`;
}
