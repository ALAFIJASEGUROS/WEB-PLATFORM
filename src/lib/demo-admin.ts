// Datos simulados para el panel de administración de la demo estática.
// Son deterministas (misma semilla, mismos datos) y coherentes entre sí: el
// embudo, las ventas por día, los descuentos y los experimentos salen de las
// mismas órdenes generadas.

import type { AdminOrderRow, AdminSnapshot, OrderStatus } from "@/domain/admin";
import { DEFAULT_DISCOUNT_RULES, DEFAULT_DISCOUNT_SETTINGS } from "@/domain/discounts";
import { FUNNEL_EVENTS } from "@/domain/events";
import { salesByDay } from "@/domain/sales";
import { twoProportionPValue } from "@/domain/stats";
import { UI_EXPERIMENTS, WEIGHT_EXPERIMENTS } from "@/recommendation/experiments";
import { todayInColombia } from "@/domain/holidays";
import { TIME_SLOTS } from "@/domain/leads";

/** Generador pseudoaleatorio con semilla (mulberry32). */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Ana", "Carlos", "Luisa", "Andrés", "Valentina", "Juan", "Daniela", "Felipe", "Camila", "Santiago", "Laura", "Mateo"];
const LAST = ["Gómez", "Rodríguez", "Martínez", "López", "García", "Hernández", "Ramírez", "Torres", "Díaz", "Moreno"];
interface DemoPlan {
  plan: string;
  insurer: string;
  type: "auto" | "moto";
  min: number;
  max: number;
  rule?: string;
}

const PLANS: DemoPlan[] = [
  { plan: "Autos Global", insurer: "SURA", type: "auto", min: 1_400_000, max: 2_600_000, rule: "sura-digital" },
  { plan: "Autos Clásico", insurer: "SURA", type: "auto", min: 2_000_000, max: 3_400_000, rule: "sura-digital" },
  { plan: "Auto Plus", insurer: "Seguros Bolívar", type: "auto", min: 1_600_000, max: 3_000_000 },
  { plan: "Auto Esencial", insurer: "Seguros Bolívar", type: "auto", min: 900_000, max: 1_500_000 },
  { plan: "Motos Integral", insurer: "SURA", type: "moto", min: 600_000, max: 1_100_000, rule: "sura-digital" },
  { plan: "Moto Plus", insurer: "Seguros Bolívar", type: "moto", min: 700_000, max: 1_300_000, rule: "bolivar-motos" },
];
const VEHICLES = { auto: ["Mazda 2 2022", "Chevrolet Onix 2021", "Renault Duster 2020", "Kia Picanto 2023"], moto: ["Yamaha NMAX 155 2023", "Honda CB 125F 2022", "Bajaj Pulsar NS 200 2021"] };

const LETTERS = "ABCDEFGHJKLMNPRSTUVWXYZ";

export function demoAdminSnapshot(now = new Date(), seed = 2026): AdminSnapshot {
  const r = rng(seed);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const between = (min: number, max: number) => Math.round((min + r() * (max - min)) / 1000) * 1000;
  const plate = (moto: boolean) =>
    Array.from({ length: 3 }, () => pick([...LETTERS])).join("") + String(Math.floor(r() * (moto ? 100 : 1000))).padStart(moto ? 2 : 3, "0") + (moto ? pick([...LETTERS]) : "");

  const orders: AdminOrderRow[] = [];
  for (let day = 29; day >= 0; day--) {
    const date = new Date(now.getTime() - day * 86_400_000);
    const weekend = [0, 6].includes(new Date(date.getTime() - 5 * 3_600_000).getUTCDay());
    const count = Math.floor((weekend ? 1 : 3) + r() * (weekend ? 3 : 6));
    for (let i = 0; i < count; i++) {
      const p = pick(PLANS);
      const moto = p.type === "moto";
      const annual = between(p.min, p.max);
      const discount = p.rule ? Math.min(Math.floor((annual * (p.rule === "bolivar-motos" ? 0.08 : 0.05)) / 1000) * 1000, p.rule === "bolivar-motos" ? 60_000 : Infinity) : 0;
      const monthly = r() < 0.35;
      const roll = r();
      const status: OrderStatus = roll < 0.68 ? "emitida" : roll < 0.8 ? "pendiente" : roll < 0.9 ? "rechazada" : roll < 0.95 ? "retractada" : roll < 0.98 ? "aprobada" : "error";
      const first = pick(FIRST);
      const last = pick(LAST);
      const createdAt = new Date(date.getTime() - Math.floor(r() * 10) * 3_600_000).toISOString();
      orders.push({
        id: `demo-${orders.length}`,
        reference: `SAF-${createdAt.slice(2, 10).replace(/-/g, "")}-${String(orders.length).padStart(3, "0")}`,
        createdAt,
        customer: `${first} ${last}`,
        email: `${first.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")}.${last.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")}@ejemplo.com`,
        plan: p.plan,
        insurer: p.insurer,
        vehicle: `${pick(VEHICLES[p.type])} · ${plate(moto)}`,
        amount: monthly ? Math.round(((annual - discount) * 1.06) / 12 / 100) * 100 : annual - discount,
        paymentPlan: monthly ? "mensual" : "anual",
        discount,
        status,
        consents: [
          { purpose: "terms", granted: true, title: "Términos · v1" },
          { purpose: "dataProcessing", granted: true, title: "Datos · v1" },
          { purpose: "marketing", granted: r() < 0.45, title: "Marketing · v1" },
        ],
      });
    }
  }
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const issued = orders.filter((o) => o.status === "emitida");
  const paid = orders.filter((o) => o.status === "emitida" || o.status === "aprobada");
  const count = <T,>(list: T[], key: (x: T) => string) =>
    Object.entries(list.reduce<Record<string, number>>((acc, x) => ({ ...acc, [key(x)]: (acc[key(x)] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);

  // Embudo coherente con las órdenes: cada paso conserva una proporción típica.
  const checkout = orders.length;
  const chosen = Math.round(checkout / 0.52);
  const sizes = [Math.round(chosen / 0.21), Math.round(chosen / 0.27), Math.round(chosen / 0.36), Math.round(chosen / 0.38), chosen, checkout, paid.length];
  const funnel = FUNNEL_EVENTS.map((step, i) => ({ step, sessions: sizes[i], fromPrevious: i === 0 ? null : sizes[i] / sizes[i - 1] }));

  // Impacto de descuentos: elegidas proporcionales a las órdenes de cada regla.
  const impactRow = (key: string, label: string, list: AdminOrderRow[], source?: "aseguradora" | "plataforma") => {
    const p = list.filter((o) => o.status === "emitida" || o.status === "aprobada");
    const chosenN = Math.round(list.length / 0.55);
    return {
      key,
      label,
      source,
      chosen: chosenN,
      orders: list.length,
      paid: p.length,
      conversion: chosenN ? p.length / chosenN : null,
      granted: p.reduce((s, o) => s + o.discount, 0),
      premium: p.reduce((s, o) => s + o.amount, 0),
    };
  };
  const byRule = (id: string) => orders.filter((o) => o.discount > 0 && PLANS.find((p) => p.plan === o.plan && p.rule === id));
  const impact = [
    impactRow("sura-digital", "Tarifa digital SURA", byRule("sura-digital"), "aseguradora"),
    impactRow("bolivar-motos", "Descuento motos Bolívar", byRule("bolivar-motos"), "aseguradora"),
    impactRow("sin-descuento", "Sin descuento", orders.filter((o) => o.discount === 0)),
  ];

  // Experimentos con resultados plausibles y valor p calculado.
  const variantRows = (variants: { id: string; label: string }[], base: number, lift: number[]) => {
    const rows = variants.map((v, i) => {
      const exposed = 380 + Math.floor(r() * 80);
      const conv = base * (1 + (lift[i] ?? 0));
      const paidN = Math.round(exposed * conv);
      return {
        variantId: v.id,
        label: v.label,
        exposed,
        started: Math.round(exposed * (0.62 + r() * 0.08)),
        chose: Math.round(exposed * 0.34),
        choseRecommended: Math.round(exposed * (0.2 + r() * 0.06)),
        checkout: Math.round(paidN * 1.6),
        paid: paidN,
        conversion: paidN / exposed,
        pValue: null as number | null,
      };
    });
    for (const row of rows.slice(1)) row.pValue = twoProportionPValue(row.paid, row.exposed, rows[0].paid, rows[0].exposed);
    return rows;
  };

  const today = todayInColombia(now);
  const addDays = (n: number) => todayInColombia(new Date(now.getTime() + n * 86_400_000));

  return {
    generatedAt: now.toISOString(),
    kpis: { orders: orders.length, issued: issued.length, revenue: issued.reduce((s, o) => s + o.amount, 0), users: Math.round(issued.length * 0.6) },
    byInsurer: count(issued, (o) => o.insurer),
    salesByDay: salesByDay(orders.map((o) => ({ createdAt: o.createdAt, amount: o.amount, issued: o.status === "emitida" })), 30, now),
    funnel,
    chosenByInsurer: count(orders, (o) => o.insurer).map(([k, v]) => [k === "Seguros Bolívar" ? "bolivar" : "sura", Math.round(v / 0.52)]),
    orders,
    reconciliation: {
      at: new Date(now.getTime() - 6 * 3_600_000).toISOString(),
      checked: orders.length,
      updated: 2,
      issues: orders
        .filter((o) => o.status === "aprobada" || o.status === "error")
        .slice(0, 3)
        .map((o) =>
          o.status === "error"
            ? { reference: o.reference, kind: "error_emision" as const, detail: "Emisión fallida tras 5 intentos. Revisar y reembolsar si aplica." }
            : { reference: o.reference, kind: "emision_en_reintento" as const, detail: "Emisión en reintento (2 intentos)." },
        ),
    },
    discounts: { settings: DEFAULT_DISCOUNT_SETTINGS, rules: DEFAULT_DISCOUNT_RULES, impact },
    experiments: [
      ...WEIGHT_EXPERIMENTS.map((e) => ({ id: e.id, question: e.question, kind: "pesos" as const, active: e.active, rows: variantRows(e.variants, 0.07, [0, 0.18]) })),
      ...UI_EXPERIMENTS.map((e, i) => ({ id: e.id, question: e.question, kind: "interfaz" as const, active: e.active, rows: variantRows(e.variants, i === 0 ? 0.08 : 0.06, i === 0 ? [0, 0.35] : [0, 0.05]) })),
    ],
    campaigns: [
      { id: "c1", title: "Revisión gratuita de frenos", sponsor: "SURA", audience: "auto", active: true },
      { id: "c2", title: "Curso de manejo preventivo para motociclistas", sponsor: "Seguros Bolívar", audience: "moto", active: true },
    ],
    pqrs: [
      { id: "q1", radicado: "PQR-2026-0012", type: "queja", typeLabel: "Queja", name: "Laura Torres", email: "laura.torres@ejemplo.com", policyNumber: "SUR-AU-00412233", message: "No me llegó el certificado de la póliza al correo.", dueDate: addDays(-1), status: "en_tramite" },
      { id: "q2", radicado: "PQR-2026-0015", type: "peticion", typeLabel: "Petición", name: "Mateo Díaz", email: "mateo.diaz@ejemplo.com", message: "Quiero cambiar la fecha de cobro de mis cuotas.", dueDate: addDays(9), status: "radicada" },
      { id: "q3", radicado: "PQR-2026-0009", type: "reclamo", typeLabel: "Reclamo", name: "Camila López", email: "camila.lopez@ejemplo.com", message: "Me cobraron dos veces la primera cuota.", dueDate: addDays(3), status: "respondida", response: "Verificamos el doble cobro y reversamos uno de los pagos." },
    ],
    leads: [
      { id: "l1", kind: "llamada", createdAt: new Date(now.getTime() - 3 * 3_600_000).toISOString(), name: "Felipe Ramírez", phone: "3004567812", email: "felipe.ramirez@ejemplo.com", slot: TIME_SLOTS.tarde, status: "nueva", summary: "Mazda CX-30 2023 · Autos Global (SURA) $3.180.000" },
      { id: "l2", kind: "flota", createdAt: new Date(now.getTime() - 20 * 3_600_000).toISOString(), name: "Daniela Moreno", phone: "3157894561", email: "daniela.moreno@ejemplo.com", slot: TIME_SLOTS.manana, status: "contactada", summary: "Mensajería Rápida SAS · 12 vehículos · $9.840.000 al año", notes: "Enviar propuesta con pago mensual." },
      { id: "l3", kind: "llamada", createdAt: new Date(now.getTime() - 50 * 3_600_000).toISOString(), name: "Santiago Hernández", phone: "3201239876", slot: TIME_SLOTS.sabado, status: "vendida", summary: "Yamaha NMAX 155 2024 · Moto Plus (Seguros Bolívar) $890.000" },
    ],
    savedQuotes: { saved: 23, reminded: 15, converted: 4 },
    outbox: orders.filter((o) => o.status === "emitida").slice(0, 6).map((o, i) => ({
      id: `m${i}`,
      to: o.email,
      channel: "email",
      subject: `Tu póliza de ${o.insurer} está activa`,
      body: `Hola ${o.customer.split(" ")[0]}, tu seguro ${o.plan} quedó activo.`,
      createdAt: o.createdAt,
    })),
    audit: [
      { id: "a1", at: new Date(now.getTime() - 2 * 3_600_000).toISOString(), actor: "ana@segualafija.co", action: "Cambió la configuración de descuentos", detail: `activos, tope ${DEFAULT_DISCOUNT_SETTINGS.maxTotalPct}%` },
      { id: "a2", at: new Date(now.getTime() - 26 * 3_600_000).toISOString(), actor: "ana@segualafija.co", action: "Exportó CSV", detail: "ordenes" },
      { id: "a3", at: new Date(now.getTime() - 50 * 3_600_000).toISOString(), actor: "luis@segualafija.co", action: "Respondió PQR", detail: `PQR-2026-0009 (${today})` },
    ],
  };
}
