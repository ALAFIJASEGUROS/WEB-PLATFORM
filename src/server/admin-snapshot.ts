import "server-only";
import type { AdminSnapshot } from "@/domain/admin";
import { salesByDay } from "@/domain/sales";
import { UI_EXPERIMENTS } from "@/recommendation/experiments";
import { auditLog } from "./admin";
import { breakdown, discountImpact, experimentResults, funnel } from "./analytics";
import { db, type Order } from "./db";
import { discountConfig } from "./discounts";
import { experiments } from "./experiments";
import { PQR_TYPE_LABELS } from "./pqr";
import { leadSummary, TIME_SLOTS } from "@/domain/leads";
import { lastReconciliation } from "./reconciliation";

const CONSENT_TITLES: Record<string, string> = { terms: "Términos", dataProcessing: "Datos", marketing: "Marketing" };

export function orderRow(o: Order) {
  return {
    id: o.id,
    reference: o.reference,
    createdAt: o.createdAt,
    customer: `${o.policyholder.firstName} ${o.policyholder.lastName}`,
    email: o.policyholder.email,
    plan: o.offer.planName,
    insurer: o.offer.insurerName,
    vehicle: `${o.quote.vehicle.brand} ${o.quote.vehicle.model} ${o.quote.vehicle.year}${o.quote.vehicle.plate ? ` · ${o.quote.vehicle.plate}` : ""}`,
    amount: o.amountInCents / 100,
    paymentPlan: o.paymentPlan,
    discount: (o.offer.discounts ?? []).reduce((s, d) => s + d.amount, 0),
    status: o.status,
    consents: o.consentEvidence.map((c) => ({
      purpose: c.purpose,
      granted: c.granted,
      title: `${CONSENT_TITLES[c.purpose] ?? c.purpose} · ${c.version} · ${c.at} · IP ${c.ip ?? "—"}`,
    })),
  };
}

/** Foto de todo lo que muestra el panel de administración. */
export function buildAdminSnapshot(now = new Date()): AdminSnapshot {
  const d = db();
  const orders = [...d.orders.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const issued = orders.filter((o) => o.status === "emitida");
  // La cuota 1 ya está en el monto de la orden; se suman las siguientes.
  const installments = [...d.policies.values()].reduce(
    (sum, p) =>
      sum + (p.status === "retractada" ? 0 : (p.installments ?? []).filter((i) => i.n > 1 && i.status === "pagada").reduce((t, i) => t + i.amount, 0)),
    0,
  );
  const { rules, settings } = discountConfig();
  return {
    generatedAt: now.toISOString(),
    kpis: {
      orders: orders.length,
      issued: issued.length,
      revenue: issued.reduce((s, o) => s + o.amountInCents / 100, 0) + installments,
      users: d.users.size,
    },
    byInsurer: Object.entries(
      issued.reduce<Record<string, number>>((acc, o) => ({ ...acc, [o.offer.insurerName]: (acc[o.offer.insurerName] ?? 0) + 1 }), {}),
    ),
    salesByDay: salesByDay(
      orders.map((o) => ({ createdAt: o.createdAt, amount: o.amountInCents / 100, issued: o.status === "emitida" })),
      30,
      now,
    ),
    funnel: funnel(),
    chosenByInsurer: breakdown("oferta_elegida", "aseguradora"),
    orders: orders.map(orderRow),
    reconciliation: lastReconciliation(),
    discounts: {
      settings,
      rules,
      impact: discountImpact(orders, Object.fromEntries(rules.map((r) => [r.id, r.label]))),
    },
    experiments: [
      ...experiments().map((e) => ({ id: e.id, question: e.question, kind: "pesos" as const, active: e.active, rows: experimentResults(e) })),
      ...UI_EXPERIMENTS.map((e) => ({ id: e.id, question: e.question, kind: "interfaz" as const, active: e.active, rows: experimentResults(e) })),
    ],
    campaigns: [...d.campaigns.values()].map((c) => ({ id: c.id, title: c.title, sponsor: c.sponsor, audience: c.audience, active: c.active })),
    pqrs: [...d.pqrs.values()]
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .map((q) => ({ ...q, typeLabel: PQR_TYPE_LABELS[q.type] })),
    leads: [...d.leads.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((l) => ({ id: l.id, kind: l.kind, createdAt: l.createdAt, name: l.name, phone: l.phone, email: l.email, slot: TIME_SLOTS[l.slot], status: l.status, summary: leadSummary(l), notes: l.notes })),
    savedQuotes: savedQuoteStats(d),
    referrals: referralStats(d),
    outbox: d.outbox.slice(0, 50).map((m) => ({ id: m.id, to: m.to, channel: m.channel, subject: m.subject, body: m.body, createdAt: m.createdAt })),
    audit: auditLog().slice(0, 100),
  };
}

function savedQuoteStats(d: ReturnType<typeof db>) {
  const saved = [...d.savedQuotes.values()];
  const paid = [...d.orders.values()].filter((o) => o.status === "aprobada" || o.status === "emitida");
  return {
    saved: saved.length,
    reminded: saved.filter((q) => q.reminderSentAt).length,
    converted: saved.filter((q) => paid.some((o) => o.policyholder.email.toLowerCase() === q.email && o.createdAt >= q.createdAt)).length,
  };
}

function referralStats(d: ReturnType<typeof db>) {
  const all = [...d.referralRewards.values()];
  const earned = all.filter((r) => r.status === "ganado");
  return {
    purchases: earned.length,
    rewards: earned.reduce((s, r) => s + r.amount, 0),
    voided: all.length - earned.length,
    referrers: new Set(earned.map((r) => r.referrerUserId)).size,
  };
}
