import type { Metadata } from "next";
import { formatCOP } from "@/domain/labels";
import { adminOpenWithoutPassword, isAdmin } from "@/server/admin";
import { db } from "@/server/db";
import { breakdown, funnel } from "@/server/analytics";
import { FUNNEL_LABELS } from "@/domain/events";
import { paymentProvider } from "@/server/payments";
import { Badge, Button, Card, Field, inputClass } from "@/components/ui";
import { ActionForm } from "@/components/account/ActionForm";
import { adminLoginAction, createCampaignAction, runRemindersAction, toggleCampaignAction } from "./actions";

export const metadata: Metadata = { title: "Administración", robots: { index: false } };

const STATUS_TONE = { pendiente: "sun", aprobada: "brand", emitida: "mint", rechazada: "coral", retractada: "neutral", error: "coral" } as const;

export default async function Page() {
  if (!(await isAdmin())) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <Card className="p-6">
          <h1 className="mb-4 text-xl font-extrabold text-heading">Administración</h1>
          <ActionForm action={adminLoginAction} submitLabel="Entrar">
            <Field label="Contraseña" htmlFor="pw"><input id="pw" name="password" type="password" required className={inputClass} /></Field>
          </ActionForm>
        </Card>
      </div>
    );
  }

  const d = db();
  const steps = funnel();
  const chosen = breakdown("oferta_elegida", "aseguradora");
  const orders = [...d.orders.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const issued = orders.filter((o) => o.status === "emitida");
  const installmentsRevenue = [...d.policies.values()].reduce(
    (sum, p) => sum + (p.status === "retractada" ? 0 : 1) * (p.installments ?? []).filter((i) => i.n > 1 && i.status === "pagada").reduce((t, i) => t + i.amount, 0),
    0,
  );
  // La cuota 1 ya está en el monto de la orden; se suman las siguientes.
  const revenue = issued.reduce((s, o) => s + o.amountInCents / 100, 0) + installmentsRevenue;
  const byInsurer = Object.entries(
    issued.reduce<Record<string, number>>((acc, o) => ({ ...acc, [o.offer.insurerName]: (acc[o.offer.insurerName] ?? 0) + 1 }), {}),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-heading">Administración</h1>
        <div className="flex gap-2">
          <Badge tone={paymentProvider().id === "wompi" ? "mint" : "sun"}>Pagos: {paymentProvider().id}</Badge>
          {adminOpenWithoutPassword() && <Badge tone="coral">Sin ADMIN_PASSWORD (solo dev)</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Órdenes", orders.length],
          ["Pólizas emitidas", issued.length],
          ["Recaudo", formatCOP(revenue)],
          ["Usuarios", d.users.size],
        ].map(([l, v]) => (
          <Card key={l} className="p-4"><p className="text-sm text-muted">{l}</p><p className="text-2xl font-extrabold text-heading">{v}</p></Card>
        ))}
      </div>
      {byInsurer.length > 0 && (
        <p className="text-sm text-muted">Emitidas por aseguradora: {byInsurer.map(([n, c]) => `${n} ${c}`).join(" · ")}</p>
      )}

      <section className="space-y-3" aria-labelledby="embudo">
        <h2 id="embudo" className="text-lg font-bold text-heading">Embudo de conversión</h2>
        <Card className="space-y-3 p-5">
          {steps[0].sessions === 0 && <p className="text-sm text-muted">Aún no hay eventos registrados.</p>}
          {steps.map((s) => (
            <div key={s.step} className="grid grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-3 text-sm">
              <span className="text-ink">{FUNNEL_LABELS[s.step]}</span>
              <span className="h-3 overflow-hidden rounded-full bg-canvas" aria-hidden>
                <span className="block h-full rounded-full bg-brand" style={{ width: `${steps[0].sessions ? (s.sessions / steps[0].sessions) * 100 : 0}%` }} />
              </span>
              <span className="w-28 text-right tabular-nums">
                <strong className="text-heading">{s.sessions}</strong>
                {s.fromPrevious !== null && <span className="text-muted"> · {Math.round(s.fromPrevious * 100)}%</span>}
              </span>
            </div>
          ))}
          {chosen.length > 0 && (
            <p className="border-t border-line pt-3 text-sm text-muted">
              Ofertas elegidas por aseguradora: {chosen.map(([k, v]) => `${k} ${v}`).join(" · ")}
            </p>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-heading">Órdenes</h2>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-muted">
              <tr>{["Referencia", "Fecha", "Cliente", "Plan", "Monto", "Autorizaciones", "Estado"].map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {orders.length === 0 && <tr><td colSpan={7} className="p-3 text-muted">Sin órdenes.</td></tr>}
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="p-3 font-mono text-xs">{o.reference}</td>
                  <td className="p-3">{o.createdAt.slice(0, 16).replace("T", " ")}</td>
                  <td className="p-3">{o.policyholder.firstName} {o.policyholder.lastName}<br /><span className="text-muted">{o.policyholder.email}</span></td>
                  <td className="p-3">{o.offer.planName}<br /><span className="text-muted">{o.offer.insurerName}</span></td>
                  <td className="p-3">{formatCOP(o.amountInCents / 100)}<br /><span className="text-muted">{o.paymentPlan}</span></td>
                  <td className="p-3 text-xs">
                    {o.consentEvidence.map((c) => (
                      <span key={c.purpose} title={`${c.version} · ${c.at} · IP ${c.ip ?? "—"}`} className={`mr-1 inline-block rounded px-1.5 py-0.5 ${c.granted ? "bg-mint-soft text-mint" : "bg-canvas text-muted"}`}>
                        {c.purpose === "terms" ? "Términos" : c.purpose === "dataProcessing" ? "Datos" : "Marketing"}
                      </span>
                    ))}
                  </td>
                  <td className="p-3"><Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-heading">Campañas</h2>
          {[...d.campaigns.values()].map((c) => (
            <Card key={c.id} className="flex items-start gap-3 p-4">
              <div className="flex-1">
                <p className="font-semibold text-heading">{c.title}</p>
                <p className="text-sm text-muted">{c.sponsor} · audiencia: {c.audience}</p>
              </div>
              <form action={toggleCampaignAction.bind(null, c.id)}>
                <Button variant={c.active ? "secondary" : "primary"} className="min-h-10 px-4 text-sm">{c.active ? "Pausar" : "Activar"}</Button>
              </form>
            </Card>
          ))}
          <Card className="p-5">
            <h3 className="mb-3 font-bold text-heading">Nueva campaña</h3>
            <ActionForm action={createCampaignAction} submitLabel="Publicar" className="space-y-3">
              <Field label="Patrocinador" htmlFor="c-sp"><input id="c-sp" name="sponsor" required className={inputClass} /></Field>
              <Field label="Título" htmlFor="c-t"><input id="c-t" name="title" required className={inputClass} /></Field>
              <Field label="Mensaje" htmlFor="c-b"><textarea id="c-b" name="body" required rows={3} className={`${inputClass} py-3`} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Texto del botón" htmlFor="c-cl"><input id="c-cl" name="ctaLabel" required className={inputClass} /></Field>
                <Field label="Enlace" htmlFor="c-cu"><input id="c-cu" name="ctaUrl" required placeholder="https://" className={inputClass} /></Field>
              </div>
              <Field label="Audiencia" htmlFor="c-a">
                <select id="c-a" name="audience" className={inputClass}><option value="todos">Todos</option><option value="auto">Carro</option><option value="moto">Moto</option></select>
              </Field>
            </ActionForm>
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-heading">Bandeja de salida (simulada)</h2>
            <form action={runRemindersAction}><Button variant="secondary" className="min-h-10 px-4 text-sm">Enviar recordatorios</Button></form>
          </div>
          <Card className="max-h-[640px] divide-y divide-line overflow-y-auto">
            {d.outbox.length === 0 && <p className="p-4 text-sm text-muted">Sin mensajes.</p>}
            {d.outbox.slice(0, 50).map((m) => (
              <div key={m.id} className="p-4 text-sm">
                <p className="text-xs text-muted">{m.createdAt.slice(0, 16).replace("T", " ")} · {m.channel} → {m.to}</p>
                <p className="font-semibold text-heading">{m.subject}</p>
                <p className="whitespace-pre-line text-muted">{m.body}</p>
              </div>
            ))}
          </Card>
        </div>
      </section>
    </div>
  );
}
