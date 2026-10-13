import { z } from "zod";
import type { ConsentRecord } from "./consents";
import type { VehicleType } from "./types";
import { formatCOP } from "./labels";

// Oportunidades comerciales: personas que piden que las llamen y empresas que
// piden una propuesta para su flota.

export type LeadKind = "llamada" | "flota";
export type LeadStatus = "nueva" | "contactada" | "vendida" | "perdida";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  nueva: "Nueva",
  contactada: "Contactada",
  vendida: "Vendida",
  perdida: "Perdida",
};

/** Franjas dentro de la ventana de contacto de la Ley 2300 de 2023. */
export const TIME_SLOTS = {
  manana: "Lunes a viernes, 7:00 a. m. a 12:00 m.",
  tarde: "Lunes a viernes, 12:00 m. a 7:00 p. m.",
  sabado: "Sábado, 8:00 a. m. a 3:00 p. m.",
} as const;
export type TimeSlot = keyof typeof TIME_SLOTS;

/** Celular colombiano: 10 dígitos que empiezan por 3 (se acepta +57). */
export function normalizeMobile(raw: string) {
  const digits = raw.replace(/\D/g, "").replace(/^57(?=3\d{9}$)/, "");
  return /^3\d{9}$/.test(digits) ? digits : null;
}

export interface LeadQuoteSummary {
  vehicleType: VehicleType;
  vehicle: string;
  city?: string;
  offers?: number;
  best?: { insurerName: string; planName: string; annualPremium: number };
}

export interface LeadFleetSummary {
  company: string;
  nit?: string;
  vehicles: number;
  total: number;
  plates: string[];
}

export interface Lead {
  id: string;
  kind: LeadKind;
  createdAt: string;
  name: string;
  phone: string;
  email?: string;
  slot: TimeSlot;
  status: LeadStatus;
  notes?: string;
  quote?: LeadQuoteSummary;
  fleet?: LeadFleetSummary;
  consent: ConsentRecord;
  history: { at: string; by: string; status: LeadStatus; note?: string }[];
}

const mobile = z.string().transform((v, ctx) => {
  const n = normalizeMobile(v);
  if (!n) ctx.addIssue({ code: "custom", message: "Escribe un celular de 10 dígitos que empiece por 3." });
  return n ?? "";
});

export const leadInputSchema = z.object({
  kind: z.enum(["llamada", "flota"]),
  name: z.string().trim().min(3, "Escribe tu nombre.").max(80),
  phone: mobile,
  email: z.union([z.email("Correo no válido."), z.literal("")]).optional(),
  slot: z.enum(Object.keys(TIME_SLOTS) as [TimeSlot, ...TimeSlot[]]),
  contactConsent: z.boolean().refine((v) => v, "Necesitamos tu autorización para llamarte."),
  quote: z
    .object({
      vehicleType: z.enum(["auto", "moto"]),
      vehicle: z.string().max(80),
      city: z.string().max(40).optional(),
      offers: z.number().int().min(0).max(50).optional(),
      best: z.object({ insurerName: z.string().max(60), planName: z.string().max(60), annualPremium: z.number().int().min(0).max(1e10) }).optional(),
    })
    .optional(),
  fleet: z
    .object({
      company: z.string().trim().min(2, "Escribe el nombre de la empresa.").max(100),
      nit: z.string().trim().max(20).optional(),
      vehicles: z.number().int().min(1).max(200),
      total: z.number().int().min(0).max(1e11),
      plates: z.array(z.string().max(8)).max(200),
    })
    .optional(),
});
export type LeadInput = z.input<typeof leadInputSchema>;

export const savedQuoteInputSchema = z.object({
  email: z.email("Escribe un correo válido."),
  consent: z.boolean().refine((v) => v, "Necesitamos tu autorización para enviarte la cotización."),
});

/** Primer error legible de una validación de zod. */
export const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Revisa los datos.";

/** Resumen de una línea para la bandeja de oportunidades. */
export const leadSummary = (l: Pick<Lead, "quote" | "fleet">) =>
  l.fleet
    ? `${l.fleet.company} · ${l.fleet.vehicles} vehículos · ${formatCOP(l.fleet.total)} al año`
    : l.quote
      ? `${l.quote.vehicle}${l.quote.best ? ` · ${l.quote.best.planName} (${l.quote.best.insurerName}) ${formatCOP(l.quote.best.annualPremium)}` : ""}`
      : "";
