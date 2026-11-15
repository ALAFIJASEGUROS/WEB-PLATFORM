import "server-only";
import { z } from "zod";
import { INSURERS } from "@/insurers/active";
import { allEvents } from "./analytics";
import { getCurrentUser } from "./auth";
import { db, newId, type Campaign } from "./db";

// Portal para aseguradoras (/aliados): métricas de su desempeño en la
// plataforma y campañas propias, que SeguAlaFija revisa antes de publicarlas.

/** Demo fuera de producción cuando no hay INSURER_PORTAL_USERS. */
const DEMO_USERS = "aliado@bolivar-demo.co:bolivar";

/** INSURER_PORTAL_USERS="ana@segurosbolivar.com:bolivar,…" → correo → aseguradora. */
export function insurerPortalUsers(env = process.env.INSURER_PORTAL_USERS ?? (process.env.NODE_ENV === "production" ? "" : DEMO_USERS)) {
  const users = new Map<string, string>();
  const known = new Set(INSURERS.map((a) => a.id));
  for (const entry of env.split(",")) {
    const [email, insurerId] = entry.trim().toLowerCase().split(":");
    if (email && insurerId && known.has(insurerId)) users.set(email, insurerId);
  }
  return users;
}

export async function insurerSession() {
  const user = await getCurrentUser();
  if (!user) return null;
  const insurerId = insurerPortalUsers().get(user.email.toLowerCase());
  const insurer = INSURERS.find((a) => a.id === insurerId);
  return insurer ? { user, insurerId: insurer.id, insurerName: insurer.name } : null;
}

/** Métricas de la aseguradora en la plataforma, sin datos personales de los clientes. */
export function insurerMetrics(insurerId: string) {
  const events = allEvents();
  const sessions = (event: string, match?: (p: Record<string, unknown>) => boolean) =>
    new Set(events.filter((e) => e.event === event && (!match || match(e.props))).map((e) => e.sid)).size;
  const resultsViewed = sessions("resultados_vistos");
  const chosen = sessions("oferta_elegida", (p) => p.aseguradora === insurerId);
  const orders = [...db().orders.values()].filter((o) => o.offer.insurerId === insurerId);
  const paid = orders.filter((o) => o.status === "aprobada" || o.status === "emitida");
  const policies = [...db().policies.values()].filter((p) => p.insurerId === insurerId && p.source === "compra" && p.status !== "retractada");
  const premium = policies.reduce((s, p) => s + (p.annualPremium ?? 0), 0);

  const byPlan = new Map<string, { plan: string; policies: number; premium: number }>();
  for (const p of policies) {
    const row = byPlan.get(p.planName) ?? { plan: p.planName, policies: 0, premium: 0 };
    row.policies++;
    row.premium += p.annualPremium ?? 0;
    byPlan.set(p.planName, row);
  }
  return {
    resultsViewed,
    chosen,
    paid: paid.length,
    policies: policies.length,
    premium,
    averagePremium: policies.length ? Math.round(premium / policies.length) : 0,
    /** De las sesiones que eligieron una oferta de la aseguradora, cuántas pagaron. */
    conversion: chosen ? paid.length / chosen : null,
    corporate: paid.filter((o) => o.company).length,
    byPlan: [...byPlan.values()].sort((a, b) => b.premium - a.premium),
  };
}

const clicksFor = (campaignId: string) => allEvents().filter((e) => e.event === "campana_clic" && e.props.campana === campaignId).length;

export type InsurerCampaignStatus = "en_revision" | "activa" | "pausada";

export const insurerCampaigns = (insurerId: string) =>
  [...db().campaigns.values()]
    .filter((c) => c.insurerId === insurerId && !c.companyId)
    .map((c) => ({
      ...c,
      status: (c.createdBy === "aseguradora" && !c.reviewedAt ? "en_revision" : c.active ? "activa" : "pausada") as InsurerCampaignStatus,
      clicks: clicksFor(c.id),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const insurerCampaignSchema = z.object({
  title: z.string().trim().min(3, "El título es muy corto.").max(100),
  body: z.string().trim().min(10, "Escribe el mensaje (mínimo 10 caracteres).").max(400),
  ctaLabel: z.string().trim().min(2).max(30),
  ctaUrl: z.string().trim().refine((u) => u.startsWith("/") || u.startsWith("https://"), "El enlace debe empezar por / o https://"),
  audience: z.enum(["auto", "moto", "todos"]),
});

/** La aseguradora propone una campaña; queda en revisión y no se publica hasta que SeguAlaFija la active. */
export function proposeCampaign(insurerId: string, insurerName: string, input: z.output<typeof insurerCampaignSchema>): Campaign {
  const c: Campaign = {
    id: newId(),
    sponsor: insurerName,
    insurerId,
    ...input,
    createdBy: "aseguradora",
    active: false,
    createdAt: new Date().toISOString(),
  };
  db().campaigns.set(c.id, c);
  return c;
}

/** La aseguradora pausa o reanuda una campaña suya ya aprobada. */
export function toggleInsurerCampaign(insurerId: string, campaignId: string) {
  const c = db().campaigns.get(campaignId);
  if (!c || c.insurerId !== insurerId || (c.createdBy === "aseguradora" && !c.reviewedAt)) return null;
  c.active = !c.active;
  return c;
}
