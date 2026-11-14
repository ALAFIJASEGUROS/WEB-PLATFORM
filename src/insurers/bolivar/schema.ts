// Formato de los mensajes de la API de Bolívar.
//
// ⚠️ SUPUESTO: Bolívar no ha entregado su especificación. Estos esquemas son un
// borrador razonable para construir y probar el adaptador; se reemplazan con la
// especificación real (OpenAPI o WSDL) cuando llegue el sandbox. Todo el mapeo
// vive en `mapping.ts`, así que el cambio queda contenido en estos dos archivos.
import { z } from "zod";

export const quotePayloadSchema = z.object({
  codigoIntermediario: z.string(),
  producto: z.enum(["AUTOS", "MOTOS"]),
  vehiculo: z.object({
    placa: z.string().optional(),
    marca: z.string(),
    linea: z.string(),
    modelo: z.number().int(),
    valorAsegurado: z.number(),
    cilindraje: z.number().optional(),
    uso: z.enum(["PARTICULAR", "TRABAJO", "DOMICILIOS"]),
  }),
  conductor: z.object({ fechaNacimiento: z.string(), ciudad: z.string() }),
  riesgo: z.object({
    parqueaderoCerrado: z.boolean(),
    kilometrajeMensual: z.enum(["BAJO", "MEDIO", "ALTO"]),
    conductoresAdicionales: z.boolean(),
    siniestrosUltimos3Anios: z.number().int(),
  }),
});
export type BolivarQuotePayload = z.infer<typeof quotePayloadSchema>;

export const quoteResponseSchema = z.object({
  cotizacionId: z.string(),
  vigenciaHasta: z.string(),
  planes: z.array(
    z.object({
      codigo: z.string(),
      nombre: z.string(),
      /** Prima anual total, IVA incluido, en COP. */
      primaTotal: z.number().positive(),
      limiteRc: z.number(),
      coberturas: z.array(z.string()),
      asistencias: z.array(z.string()),
      deducible: z.object({ porcentaje: z.number(), minimoSmmlv: z.number() }),
      diasVehiculoReemplazo: z.number().int().default(0),
      exclusiones: z.array(z.string()).default([]),
      usosPermitidos: z.array(z.enum(["PARTICULAR", "TRABAJO", "DOMICILIOS"])).optional(),
      cilindrajeMaximo: z.number().optional(),
      urlCondicionado: z.string().optional(),
    }),
  ),
});
export type BolivarQuoteResponse = z.infer<typeof quoteResponseSchema>;

export const issuePayloadSchema = z.object({
  codigoIntermediario: z.string(),
  cotizacionId: z.string(),
  codigoPlan: z.string(),
  fechaInicio: z.string(),
  tomador: z.object({ tipoDocumento: z.string(), numeroDocumento: z.string(), nombreCompleto: z.string() }),
  sarlaft: z.record(z.string(), z.union([z.string(), z.boolean()])),
});
export type BolivarIssuePayload = z.infer<typeof issuePayloadSchema>;

export const issueResponseSchema = z.object({
  solicitudId: z.string(),
  estado: z.enum(["EMITIDA", "EN_PROCESO", "INSPECCION", "RECHAZADA"]),
  numeroPoliza: z.string().optional(),
  motivo: z.string().optional(),
  instrucciones: z.string().optional(),
});
export type BolivarIssueResponse = z.infer<typeof issueResponseSchema>;

export const documentResponseSchema = z.object({
  url: z.string(),
  tipoContenido: z.string().default("application/pdf"),
  versionCondicionado: z.string().optional(),
});

export const tokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number().default(3600),
});
