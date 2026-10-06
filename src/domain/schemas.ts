import { z } from "zod";
import { SERVICE_KEYS } from "./types";

export const vehicleSchema = z.object({
  type: z.enum(["auto", "moto"]),
  plate: z.string().max(8).optional(),
  brand: z.string().min(1).max(40),
  model: z.string().min(1).max(60),
  year: z.number().int().min(1990).max(2027),
  commercialValue: z.number().int().min(1_000_000).max(2_000_000_000),
});

export const quoteRequestSchema = z.object({
  vehicle: vehicleSchema,
  driver: z.object({
    birthdate: z.iso.date(),
    city: z.string().min(2).max(40),
  }),
  answers: z.object({
    priority: z.enum(["precio", "cobertura", "servicios", "equilibrio"]),
    use: z.enum(["particular", "trabajo", "domicilios"]),
    parking: z.enum(["cerrado", "calle"]),
    mileage: z.enum(["bajo", "medio", "alto"]).default("medio"),
    drivers: z.enum(["solo", "varios"]).default("solo"),
    financed: z.boolean(),
    deductibleTolerance: z.enum(["bajo", "medio", "alto"]),
    services: z.array(z.enum(SERVICE_KEYS)).max(SERVICE_KEYS.length),
    claimsLast3Years: z.number().int().min(0).max(10),
  }),
});

/** Documento colombiano: CC, CE, PA o NIT (persona natural con NIT). */
export const policyholderSchema = z.object({
  firstName: z.string().trim().min(2, "Escribe tus nombres").max(60),
  lastName: z.string().trim().min(2, "Escribe tus apellidos").max(60),
  documentType: z.enum(["CC", "CE", "PA"]),
  documentNumber: z
    .string()
    .regex(/^[A-Z0-9]{5,15}$/i, "Escribe tu número de documento, sin puntos"),
  email: z.email("Escribe un correo válido, como nombre@correo.com"),
  phone: z.string().regex(/^3\d{9}$/, "Escribe un celular de 10 dígitos que empiece por 3"),
  address: z.string().trim().min(5, "Escribe tu dirección").max(120),
});

export const checkoutSchema = z.object({
  quote: quoteRequestSchema,
  offerId: z.string().min(3).max(60),
  analyticsSid: z.string().max(64).optional(),
  paymentPlan: z.enum(["anual", "mensual"]),
  policyholder: policyholderSchema,
  consents: z.object({
    terms: z.literal(true),
    dataProcessing: z.literal(true),
    marketing: z.boolean(),
  }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type Policyholder = z.infer<typeof policyholderSchema>;
