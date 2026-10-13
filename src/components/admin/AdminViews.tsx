import type { ReactNode } from "react";
import Link from "next/link";
import type { AdminSnapshot, OrderStatus } from "@/domain/admin";
import { ORDER_STATUS_LABELS } from "@/domain/admin";
import { describeRule } from "@/domain/discounts";
import { FUNNEL_LABELS } from "@/domain/events";
import { formatCOP } from "@/domain/labels";
import { LEAD_STATUS_LABELS } from "@/domain/leads";
import { Badge, Card } from "@/components/ui";

// Vistas de solo lectura del panel. Las usan /admin (con datos reales y
// controles de edición en los "slots") y la demo estática (con datos simulados).

export const STATUS_TONE: Record<OrderStatus, "sun" | "brand" | "mint" | "coral" | "neutral"> = {
  pendiente: "sun",
  aprobada: "brand",
  emitida: "mint",
  rechazada: "coral",
  retractada: "neutral",
  error: "coral",
  reembolsada: "neutral",
};

const pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);
const when = (iso: string) => iso.slice(0, 16).replace("T", " ");
const SOURCE_LABEL = { aseguradora: "Asume la aseguradora", plataforma: "Asume SeguAlaFija" } as const;

export function SectionTitle({ id, children, action }: { id: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className="text-lg font-bold text-heading">{children}</h2>
      {action}
    </div>
  );
}

export function KpiCards({ kpis, byInsurer }: Pick<AdminSnapshot, "kpis" | "byInsurer">) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {([
          ["Órdenes", kpis.orders],
          ["Pólizas emitidas", kpis.issued],
          ["Recaudo", formatCOP(kpis.revenue)],
          ["Usuarios", kpis.users],
        ] as const).map(([l, v]) => (
          <Card key={l} className="p-4">
            <p className="text-sm text-muted">{l}</p>
            <p className="break-words text-xl font-extrabold tabular-nums text-heading md:text-2xl">{v}</p>
          </Card>
        ))}
      </div>
      {byInsurer.length > 0 && (
        <p className="text-sm text-muted">Emitidas por aseguradora: {byInsurer.map(([n, c]) => `${n} ${c}`).join(" · ")}</p>
      )}
    </>
  );
}

export function FunnelView({ funnel, chosenByInsurer }: Pick<AdminSnapshot, "funnel" | "chosenByInsurer">) {
  const top = funnel[0]?.sessions ?? 0;
  return (
    <Card className="space-y-3 p-5">
      {top === 0 && <p className="text-sm text-muted">Aún no hay eventos registrados.</p>}
      {funnel.map((s) => (
        <div key={s.step} className="grid grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="text-ink">{FUNNEL_LABELS[s.step]}</span>
          <span className="h-3 overflow-hidden rounded-full bg-canvas" aria-hidden>
            <span className="block h-full rounded-full bg-brand" style={{ width: `${top ? (s.sessions / top) * 100 : 0}%` }} />
          </span>
          <span className="w-28 text-right tabular-nums">
            <strong className="text-heading">{s.sessions}</strong>
            {s.fromPrevious !== null && <span className="text-muted"> · {Math.round(s.fromPrevious * 100)}%</span>}
          </span>
        </div>
      ))}
      {chosenByInsurer.length > 0 && (
        <p className="border-t border-line pt-3 text-sm text-muted">
          Ofertas elegidas por aseguradora: {chosenByInsurer.map(([k, v]) => `${k} ${v}`).join(" · ")}
        </p>
      )}
    </Card>
  );
}

export function ReconView({ report }: { report: AdminSnapshot["reconciliation"] }) {
  return (
    <Card className="space-y-2 p-4 text-sm">
      {!report ? (
        <p className="text-muted">Aún no se ha ejecutado. También corre a diario con el cron.</p>
      ) : (
        <>
          <p className="text-muted">
            Última ejecución {when(report.at)} UTC · {report.checked} revisados · {report.updated} actualizados
          </p>
          {report.issues.length === 0 ? (
            <p className="font-semibold text-mint">Sin novedades.</p>
          ) : (
            <ul className="divide-y divide-line">
              {report.issues.map((i) => (
                <li key={`${i.reference}-${i.kind}`} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="font-mono text-xs">{i.reference}</span>
                  <Badge tone={i.kind === "sin_aceptacion" ? "neutral" : "coral"}>{i.kind.replace(/_/g, " ")}</Badge>
                  <span className="text-muted">{i.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

export function OrdersTable({ orders, detailHref }: { orders: AdminSnapshot["orders"]; detailHref?: (reference: string) => string }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="text-left text-muted">
          <tr>{["Referencia", "Fecha", "Cliente", "Plan", "Monto", "Autorizaciones", "Estado"].map((h) => <th key={h} scope="col" className="p-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {orders.length === 0 && <tr><td colSpan={7} className="p-3 text-muted">Sin órdenes.</td></tr>}
          {orders.map((o) => (
            <tr key={o.id} className="border-t border-line">
              <td className="p-3 font-mono text-xs">
                {detailHref ? <Link href={detailHref(o.reference)} className="text-brand underline">{o.reference}</Link> : o.reference}
              </td>
              <td className="p-3">{when(o.createdAt)}</td>
              <td className="p-3">{o.customer}<br /><span className="text-muted">{o.email}</span></td>
              <td className="p-3">{o.plan}<br /><span className="text-muted">{o.insurer}</span></td>
              <td className="p-3 tabular-nums">
                {formatCOP(o.amount)}
                <br />
                <span className="text-muted">{o.paymentPlan}{o.discount > 0 && ` · −${formatCOP(o.discount)}`}</span>
              </td>
              <td className="p-3 text-xs">
                {o.consents.map((c) => (
                  <span key={c.purpose} title={c.title} className={`mr-1 inline-block rounded px-1.5 py-0.5 ${c.granted ? "bg-mint-soft text-mint" : "bg-canvas text-muted"}`}>
                    {c.purpose === "terms" ? "Términos" : c.purpose === "dataProcessing" ? "Datos" : "Marketing"}
                  </span>
                ))}
              </td>
              <td className="p-3"><Badge tone={STATUS_TONE[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export function DiscountRulesList({ discounts, ruleActions }: {
  discounts: AdminSnapshot["discounts"];
  ruleActions?: (rule: AdminSnapshot["discounts"]["rules"][number]) => ReactNode;
}) {
  return (
    <Card className="divide-y divide-line">
      {discounts.rules.length === 0 && <p className="p-4 text-sm text-muted">Sin reglas.</p>}
      {discounts.rules.map((r) => (
        <div key={r.id} className="space-y-2 p-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-heading">{r.label}</p>
              <p className="text-sm text-muted">{describeRule(r)}</p>
            </div>
            <Badge tone={r.source === "plataforma" ? "sun" : "brand"}>{SOURCE_LABEL[r.source]}</Badge>
            {ruleActions ? ruleActions(r) : <Badge tone={r.enabled ? "mint" : "neutral"}>{r.enabled ? "Activa" : "Apagada"}</Badge>}
          </div>
        </div>
      ))}
    </Card>
  );
}

export function ImpactTable({ rows }: { rows: AdminSnapshot["discounts"]["impact"] }) {
  return (
    <Card className="space-y-2 p-5">
      <h3 className="font-bold text-heading">Impacto en la conversión</h3>
      <p className="text-xs text-muted">
        Elegidas: veces que alguien escogió una oferta con ese descuento. Conversión: compras pagadas sobre elegidas. El costo
        es el descuento otorgado en compras pagadas; compáralo con la fila sin descuento.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="text-left text-muted">
              {["Descuento", "Elegidas", "Órdenes", "Pagadas", "Conversión", "Costo", "Prima cobrada"].map((h, i) => (
                <th key={h} scope="col" className={`py-2 font-medium ${i ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-line">
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  <span className="font-semibold text-ink">{r.label}</span>
                  {r.source && <span className="block text-xs text-muted">{SOURCE_LABEL[r.source]}</span>}
                </th>
                <td className="py-2 text-right tabular-nums">{r.chosen}</td>
                <td className="py-2 text-right tabular-nums">{r.orders}</td>
                <td className="py-2 text-right tabular-nums">{r.paid}</td>
                <td className="py-2 text-right font-semibold tabular-nums">{pct(r.conversion)}</td>
                <td className="py-2 text-right tabular-nums">{formatCOP(r.granted)}</td>
                <td className="py-2 text-right tabular-nums">{formatCOP(r.premium)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/** Mínimo de sesiones por variante antes de mirar el valor p. */
export const MIN_SAMPLE = 100;

export function ExperimentCard({ exp, action }: { exp: AdminSnapshot["experiments"][number]; action?: ReactNode }) {
  const small = exp.rows.some((r) => r.exposed < MIN_SAMPLE);
  const maxConv = Math.max(...exp.rows.map((r) => r.conversion ?? 0), 0.0001);
  return (
    <Card className="space-y-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-heading">{exp.question}</p>
          <p className="text-xs text-muted">{exp.id} · {exp.kind === "pesos" ? "pesos del recomendador" : "interfaz"}</p>
        </div>
        {action ?? (
          <Badge tone={exp.active ? "mint" : "neutral"}>{exp.active ? "Activo" : "Detenido"}{exp.kind === "interfaz" && " (en el código)"}</Badge>
        )}
      </div>
      {/* Conversión por variante: una barra por variante, misma escala. */}
      <div className="space-y-1.5" aria-hidden>
        {exp.rows.map((r) => (
          <div key={r.variantId} className="grid grid-cols-[minmax(0,9rem)_1fr_4rem] items-center gap-2 text-xs">
            <span className="truncate text-ink">{r.variantId}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-canvas">
              <span className="block h-full rounded-full bg-brand" style={{ width: `${((r.conversion ?? 0) / maxConv) * 100}%` }} />
            </span>
            <span className="text-right tabular-nums text-ink">{pct(r.conversion)}</span>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="text-left text-muted">
              {["Variante", "Sesiones", "Inició cotización", "Eligió oferta", "Eligió la recomendada", "Fue a pagar", "Compró", "Conversión", "Valor p"].map((h, i) => (
                <th key={h} scope="col" className={`py-2 font-medium ${i ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exp.rows.map((r, i) => (
              <tr key={r.variantId} className="border-t border-line">
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  <span className="font-semibold text-ink">{r.variantId}</span>
                  {i === 0 && <span className="text-muted"> (control)</span>}
                  <span className="block text-xs text-muted">{r.label}</span>
                </th>
                <td className="py-2 text-right tabular-nums">{r.exposed}</td>
                <td className="py-2 text-right tabular-nums">{r.exposed ? pct(r.started / r.exposed) : "—"}</td>
                <td className="py-2 text-right tabular-nums">{r.exposed ? pct(r.chose / r.exposed) : "—"}</td>
                <td className="py-2 text-right tabular-nums">{r.exposed ? pct(r.choseRecommended / r.exposed) : "—"}</td>
                <td className="py-2 text-right tabular-nums">{r.checkout}</td>
                <td className="py-2 text-right tabular-nums">{r.paid}</td>
                <td className="py-2 text-right font-semibold tabular-nums">{pct(r.conversion)}</td>
                <td className="py-2 text-right tabular-nums">{r.pValue === null ? "—" : r.pValue.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        {small
          ? `Aún no hay datos suficientes: espera al menos ${MIN_SAMPLE} sesiones por variante antes de concluir.`
          : "Un valor p menor a 0,05 sugiere que la diferencia en compras no es casualidad."}
      </p>
    </Card>
  );
}

export function CampaignList({ campaigns, action }: { campaigns: AdminSnapshot["campaigns"]; action?: (c: AdminSnapshot["campaigns"][number]) => ReactNode }) {
  return (
    <>
      {campaigns.map((c) => (
        <Card key={c.id} className="flex items-start gap-3 p-4">
          <div className="flex-1">
            <p className="font-semibold text-heading">{c.title}</p>
            <p className="text-sm text-muted">{c.sponsor} · audiencia: {c.audience}</p>
          </div>
          {action ? action(c) : <Badge tone={c.active ? "mint" : "neutral"}>{c.active ? "Activa" : "Pausada"}</Badge>}
        </Card>
      ))}
    </>
  );
}

export function OutboxList({ outbox }: Pick<AdminSnapshot, "outbox">) {
  return (
    <Card className="max-h-[640px] divide-y divide-line overflow-y-auto">
      {outbox.length === 0 && <p className="p-4 text-sm text-muted">Sin mensajes.</p>}
      {outbox.map((m) => (
        <div key={m.id} className="p-4 text-sm">
          <p className="text-xs text-muted">{when(m.createdAt)} · {m.channel} → {m.to}</p>
          <p className="font-semibold text-heading">{m.subject}</p>
          <p className="whitespace-pre-line text-muted">{m.body}</p>
        </div>
      ))}
    </Card>
  );
}

export function PqrList({ pqrs, today, form }: Pick<AdminSnapshot, "pqrs"> & { today: string; form?: (q: AdminSnapshot["pqrs"][number]) => ReactNode }) {
  return (
    <>
      {pqrs.length === 0 && <Card className="p-4 text-sm text-muted">Sin solicitudes.</Card>}
      <div className="grid gap-3 md:grid-cols-2">
        {pqrs.map((q) => {
          const overdue = q.status !== "respondida" && q.dueDate < today;
          return (
            <Card key={q.id} className="space-y-2 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="font-mono text-xs">{q.radicado}</strong>
                <Badge tone="brand">{q.typeLabel}</Badge>
                <Badge tone={q.status === "respondida" ? "mint" : overdue ? "coral" : "sun"}>{q.status.replace("_", " ")}</Badge>
                <span className={`text-xs ${overdue ? "font-bold text-coral-ink" : "text-muted"}`}>vence {q.dueDate}</span>
              </div>
              <p className="text-muted">{q.name} · {q.email}{q.policyNumber ? ` · póliza ${q.policyNumber}` : ""}</p>
              <p className="whitespace-pre-line">{q.message}</p>
              {q.response && <p className="rounded-xl bg-mint-soft p-2 text-ink">Respuesta: {q.response}</p>}
              {form?.(q)}
            </Card>
          );
        })}
      </div>
    </>
  );
}

const LEAD_TONE = { nueva: "sun", contactada: "brand", vendida: "mint", perdida: "coral" } as const;

export function ReferralLine({ referrals }: Pick<AdminSnapshot, "referrals">) {
  return (
    <p className="text-sm text-muted">
      Referidos: <strong className="text-heading">{referrals.purchases}</strong> compras de{" "}
      <strong className="text-heading">{referrals.referrers}</strong> personas que invitaron · bonos{" "}
      <strong className="text-heading">{formatCOP(referrals.rewards)}</strong>
      {referrals.voided > 0 && <> · {referrals.voided} anulados por retracto o reembolso</>}
    </p>
  );
}

export function LeadList({ leads, savedQuotes, form }: Pick<AdminSnapshot, "leads" | "savedQuotes"> & { form?: (l: AdminSnapshot["leads"][number]) => ReactNode }) {
  return (
    <>
      <p className="text-sm text-muted">
        Cotizaciones guardadas por correo: <strong className="text-heading">{savedQuotes.saved}</strong> · con recordatorio{" "}
        <strong className="text-heading">{savedQuotes.reminded}</strong> · terminaron en compra <strong className="text-heading">{savedQuotes.converted}</strong>
      </p>
      {leads.length === 0 && <Card className="p-4 text-sm text-muted">Sin oportunidades por ahora.</Card>}
      <div className="grid gap-3 md:grid-cols-2">
        {leads.map((l) => (
          <Card key={l.id} className="space-y-2 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-heading">{l.name}</strong>
              <Badge tone={l.kind === "flota" ? "brand" : "sun"}>{l.kind === "flota" ? "Flota" : "Llamada"}</Badge>
              <Badge tone={LEAD_TONE[l.status]}>{LEAD_STATUS_LABELS[l.status]}</Badge>
              <span className="text-xs text-muted">{when(l.createdAt)}</span>
            </div>
            <p><a href={`tel:+57${l.phone}`} className="font-semibold text-brand hover:underline">{l.phone}</a>{l.email && <span className="text-muted"> · {l.email}</span>}</p>
            <p className="text-muted">Llamar: {l.slot}</p>
            {l.summary && <p>{l.summary}</p>}
            {l.notes && <p className="rounded-xl bg-canvas p-2 text-ink">Nota: {l.notes}</p>}
            {form?.(l)}
          </Card>
        ))}
      </div>
    </>
  );
}

export function AuditList({ audit }: Pick<AdminSnapshot, "audit">) {
  return (
    <Card className="max-h-80 divide-y divide-line overflow-y-auto text-sm">
      {audit.length === 0 && <p className="p-4 text-muted">Sin acciones registradas.</p>}
      {audit.map((a) => (
        <p key={a.id} className="p-3">
          <span className="text-xs text-muted">{when(a.at)} · {a.actor}</span>
          <br />
          <strong className="text-heading">{a.action}</strong> {a.detail && <span className="text-muted">— {a.detail}</span>}
        </p>
      ))}
    </Card>
  );
}
