// Traducción entre el modelo canónico y los mensajes de Bolívar.
// Los códigos de cobertura y asistencia son SUPUESTOS hasta recibir el catálogo
// oficial (ver docs/bolivar.md, cuestionario técnico, punto 3).
import type { CoverageKey, Offer, QuoteRequest, ServiceKey, VehicleUse } from "@/domain/types";
import { COVERAGE_KEYS } from "@/domain/types";
import { priceBreakdown } from "@/domain/pricing";
import type { IssueRequest, IssueResult } from "../adapter";
import { COMMON_EXCLUSIONS } from "../mock/tariff";
import type {
  BolivarIssuePayload,
  BolivarIssueResponse,
  BolivarQuotePayload,
  BolivarQuoteResponse,
} from "./schema";

export const BOLIVAR_ID = "bolivar";
export const BOLIVAR_NAME = "Seguros Bolívar";

/** Catálogo de coberturas de Bolívar → `CoverageKey`. Versionar al cambiar. */
export const COVERAGE_CATALOG: Record<string, CoverageKey> = {
  RCE: "rc",
  PTD: "perdidaTotalDanos",
  PPD: "perdidaParcialDanos",
  PTH: "perdidaTotalHurto",
  PPH: "perdidaParcialHurto",
  EVN: "eventosNaturaleza",
  APC: "accidentesPersonales",
};

/** Catálogo de asistencias de Bolívar → `ServiceKey`. */
export const SERVICE_CATALOG: Record<string, ServiceKey> = {
  GRUA: "grua",
  VREE: "autoSustituto",
  CEL: "conductorElegido",
  JUR: "asistenciaJuridica",
  VIA: "asistenciaViaje",
  CERR: "cerrajeria",
  LLAN: "llantas",
};
export const CATALOG_VERSION = "borrador-2026-11";

const USE: Record<VehicleUse, BolivarQuotePayload["vehiculo"]["uso"]> = {
  particular: "PARTICULAR",
  trabajo: "TRABAJO",
  domicilios: "DOMICILIOS",
};
const USE_BACK = Object.fromEntries(Object.entries(USE).map(([k, v]) => [v, k])) as Record<string, VehicleUse>;

export function toQuotePayload(req: QuoteRequest, intermediaryCode: string): BolivarQuotePayload {
  const { vehicle: v, driver: d, answers: a } = req;
  return {
    codigoIntermediario: intermediaryCode,
    producto: v.type === "auto" ? "AUTOS" : "MOTOS",
    vehiculo: {
      ...(v.plate && { placa: v.plate.toUpperCase() }),
      marca: v.brand,
      linea: v.model,
      modelo: v.year,
      valorAsegurado: v.commercialValue,
      ...(v.engineCc && { cilindraje: v.engineCc }),
      uso: USE[a.use],
    },
    conductor: { fechaNacimiento: d.birthdate, ciudad: d.city },
    riesgo: {
      parqueaderoCerrado: a.parking === "cerrado",
      kilometrajeMensual: a.mileage.toUpperCase() as "BAJO" | "MEDIO" | "ALTO",
      conductoresAdicionales: a.drivers === "varios",
      siniestrosUltimos3Anios: a.claimsLast3Years,
    },
  };
}

/** Códigos que no están en el catálogo: se reportan para actualizarlo. */
export function unknownCodes(res: BolivarQuoteResponse): string[] {
  const codes = res.planes.flatMap((p) => [
    ...p.coberturas.filter((c) => !(c in COVERAGE_CATALOG)),
    ...p.asistencias.filter((c) => !(c in SERVICE_CATALOG)),
  ]);
  return [...new Set(codes)];
}

export function toOffers(res: BolivarQuoteResponse, req: QuoteRequest): Offer[] {
  return res.planes.map((p) => {
    const covered = new Set(p.coberturas.map((c) => COVERAGE_CATALOG[c]).filter(Boolean));
    return {
      id: `${BOLIVAR_ID}:${p.codigo}`,
      insurerId: BOLIVAR_ID,
      insurerName: BOLIVAR_NAME,
      planName: p.nombre,
      vehicleType: req.vehicle.type,
      ...priceBreakdown(Math.round(p.primaTotal)),
      rcLimit: p.limiteRc,
      coverages: Object.fromEntries(COVERAGE_KEYS.map((k) => [k, covered.has(k)])) as Record<CoverageKey, boolean>,
      deductiblePct: p.deducible.porcentaje,
      deductibleMinSmmlv: p.deducible.minimoSmmlv,
      services: [...new Set(p.asistencias.map((c) => SERVICE_CATALOG[c]).filter(Boolean))],
      substituteCarDays: p.diasVehiculoReemplazo,
      exclusions: [...COMMON_EXCLUSIONS, ...p.exclusiones],
      conditionsUrl: p.urlCondicionado ?? `/condicionado/${BOLIVAR_ID}/${p.codigo}`,
      validUntil: res.vigenciaHasta,
      externalQuoteId: res.cotizacionId,
      ...(p.usosPermitidos && { allowedUses: p.usosPermitidos.map((u) => USE_BACK[u]) }),
      ...(p.cilindrajeMaximo && { maxEngineCc: p.cilindrajeMaximo }),
    };
  });
}

export function toIssuePayload(req: IssueRequest, intermediaryCode: string): BolivarIssuePayload {
  if (!req.offer.externalQuoteId) throw new Error("La oferta no trae el id de cotización de Bolívar.");
  return {
    codigoIntermediario: intermediaryCode,
    cotizacionId: req.offer.externalQuoteId,
    codigoPlan: req.offer.id.slice(BOLIVAR_ID.length + 1),
    fechaInicio: req.startDate,
    tomador: {
      tipoDocumento: req.holder.documentType,
      numeroDocumento: req.holder.documentNumber,
      nombreCompleto: req.holder.fullName,
    },
    sarlaft: req.kyc,
  };
}

export function toIssueResult(res: BolivarIssueResponse): IssueResult {
  switch (res.estado) {
    case "EMITIDA":
      if (!res.numeroPoliza) throw new Error("Bolívar marcó la póliza como emitida sin número.");
      return { status: "emitida", policyNumber: res.numeroPoliza };
    case "EN_PROCESO":
      return { status: "pendiente", externalId: res.solicitudId };
    case "INSPECCION":
      return { status: "requiere_inspeccion", externalId: res.solicitudId, instructions: res.instrucciones };
    case "RECHAZADA":
      return { status: "rechazada", reason: res.motivo ?? "Bolívar no aprobó la emisión." };
  }
}
