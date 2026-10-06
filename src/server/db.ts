import "server-only";
import type { CheckoutInput } from "@/domain/schemas";
import type { Offer, QuoteRequest, Vehicle, VehicleType } from "@/domain/types";

// Persistencia EN MEMORIA para el MVP/demo. Las funciones de este módulo son
// el único punto de acceso a datos, de modo que reemplazarlo por PostgreSQL
// (Supabase) no cambia el resto de la app. Los datos se pierden al reiniciar.

export type OrderStatus = "pendiente" | "aprobada" | "rechazada" | "emitida" | "error";

export interface Order {
  id: string;
  reference: string;
  createdAt: string;
  status: OrderStatus;
  quote: QuoteRequest;
  offer: Offer;
  paymentPlan: CheckoutInput["paymentPlan"];
  amountInCents: number;
  policyholder: CheckoutInput["policyholder"];
  consents: CheckoutInput["consents"];
  provider: string;
  providerTransactionId?: string;
  policyId?: string;
  /** Token para que un comprador sin cuenta pueda ver su compra. */
  accessToken: string;
  userId?: string;
}

export interface Policy {
  id: string;
  number: string;
  source: "compra" | "externa";
  orderId?: string;
  userId?: string;
  holderEmail: string;
  holderName: string;
  insurerId: string;
  insurerName: string;
  planName: string;
  vehicle: Vehicle;
  startDate: string;
  endDate: string;
  annualPremium?: number;
  paymentPlan?: "anual" | "mensual";
  accessToken: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  createdAt: string;
  marketingConsent: boolean;
  channels: { email: boolean; whatsapp: boolean };
}

export interface UserVehicle {
  id: string;
  userId: string;
  type: VehicleType;
  plate: string;
  brand: string;
  model: string;
  year: number;
  soatExpiry?: string;
  rtmExpiry?: string;
}

export type ReminderKind = "poliza" | "soat" | "tecnomecanica" | "cuota" | "otro";

export interface Reminder {
  id: string;
  userId: string;
  kind: ReminderKind;
  title: string;
  dueDate: string;
  daysBefore: number;
  vehicleId?: string;
  policyId?: string;
  /** Última fecha en que se envió el aviso. */
  lastSentAt?: string;
  auto: boolean;
}

export interface Campaign {
  id: string;
  sponsor: string;
  insurerId?: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  audience: VehicleType | "todos";
  active: boolean;
  createdAt: string;
}

export interface OutboxMessage {
  id: string;
  to: string;
  channel: "email" | "whatsapp";
  subject: string;
  body: string;
  createdAt: string;
}

export interface Otp {
  email: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
}

interface Db {
  orders: Map<string, Order>;
  policies: Map<string, Policy>;
  users: Map<string, User>;
  vehicles: Map<string, UserVehicle>;
  reminders: Map<string, Reminder>;
  campaigns: Map<string, Campaign>;
  outbox: OutboxMessage[];
  otps: Map<string, Otp>;
  processedEvents: Set<string>;
}

function seed(db: Db) {
  const now = new Date().toISOString();
  const campaigns: Campaign[] = [
    {
      id: "c-sura-1",
      sponsor: "SURA",
      insurerId: "sura",
      title: "Revisión gratuita de frenos",
      body: "Si tienes póliza de autos, agenda una revisión de frenos sin costo en talleres aliados. (Contenido de demostración)",
      ctaLabel: "Conocer más",
      ctaUrl: "/ayuda",
      audience: "auto",
      active: true,
      createdAt: now,
    },
    {
      id: "c-bolivar-1",
      sponsor: "Seguros Bolívar",
      insurerId: "bolivar",
      title: "Curso de manejo preventivo para motociclistas",
      body: "Inscríbete gratis al curso virtual de manejo defensivo. (Contenido de demostración)",
      ctaLabel: "Inscribirme",
      ctaUrl: "/ayuda",
      audience: "moto",
      active: true,
      createdAt: now,
    },
  ];
  campaigns.forEach((c) => db.campaigns.set(c.id, c));
}

const g = globalThis as unknown as { __safDb?: Db };

export function db(): Db {
  if (!g.__safDb) {
    g.__safDb = {
      orders: new Map(),
      policies: new Map(),
      users: new Map(),
      vehicles: new Map(),
      reminders: new Map(),
      campaigns: new Map(),
      outbox: [],
      otps: new Map(),
      processedEvents: new Set(),
    };
    seed(g.__safDb);
  }
  return g.__safDb;
}

export const newId = () => crypto.randomUUID();

export function randomToken(bytes = 24) {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Buffer.from(arr).toString("base64url");
}

// ── Usuarios ────────────────────────────────────────────────────────────────

export function findUserByEmail(email: string) {
  const e = email.toLowerCase();
  return [...db().users.values()].find((u) => u.email === e);
}

export function getOrCreateUser(email: string): User {
  const existing = findUserByEmail(email);
  if (existing) return existing;
  const user: User = {
    id: newId(),
    email: email.toLowerCase(),
    createdAt: new Date().toISOString(),
    marketingConsent: false,
    channels: { email: true, whatsapp: false },
  };
  db().users.set(user.id, user);
  return user;
}

/**
 * Asocia a la cuenta las compras hechas sin registro con el mismo correo.
 * Solo se llama después de verificar el correo con OTP.
 */
export function claimGuestPurchases(user: User) {
  const d = db();
  for (const o of d.orders.values()) {
    if (!o.userId && o.policyholder.email.toLowerCase() === user.email) {
      o.userId = user.id;
      if (!user.name) user.name = `${o.policyholder.firstName} ${o.policyholder.lastName}`;
      if (!user.phone) user.phone = o.policyholder.phone;
      if (o.consents.marketing) user.marketingConsent = true;
    }
  }
  for (const p of d.policies.values()) {
    if (!p.userId && p.holderEmail.toLowerCase() === user.email) {
      attachPolicyToUser(p, user.id);
    }
  }
}

/** Vincula la póliza, crea el vehículo y los recordatorios automáticos. */
export function attachPolicyToUser(p: Policy, userId: string) {
  const d = db();
  p.userId = userId;
  const plate = p.vehicle.plate ?? `${p.vehicle.brand}-${p.vehicle.model}`.toUpperCase();
  let vehicle = [...d.vehicles.values()].find(
    (v) => v.userId === userId && v.plate === plate,
  );
  if (!vehicle) {
    vehicle = {
      id: newId(),
      userId,
      type: p.vehicle.type,
      plate,
      brand: p.vehicle.brand,
      model: p.vehicle.model,
      year: p.vehicle.year,
    };
    d.vehicles.set(vehicle.id, vehicle);
  }
  const exists = [...d.reminders.values()].some(
    (r) => r.policyId === p.id && r.kind === "poliza",
  );
  if (!exists) {
    const r: Reminder = {
      id: newId(),
      userId,
      kind: "poliza",
      title: `Renovar ${p.planName} (${p.insurerName}) · ${plate}`,
      dueDate: p.endDate,
      daysBefore: 30,
      vehicleId: vehicle.id,
      policyId: p.id,
      auto: true,
    };
    d.reminders.set(r.id, r);
  }
}

// ── Mensajería (simulada) ──────────────────────────────────────────────────

export function sendMessage(msg: Omit<OutboxMessage, "id" | "createdAt">) {
  const m = { ...msg, id: newId(), createdAt: new Date().toISOString() };
  db().outbox.unshift(m);
  if (process.env.NODE_ENV !== "test") {
    console.info(`[outbox] ${m.channel} → ${m.to}: ${m.subject}`);
  }
  return m;
}
