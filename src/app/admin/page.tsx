import type { Metadata } from "next";
import { adminOpenForDemo, adminSession } from "@/server/admin";
import { getCurrentUser } from "@/server/auth";
import { LoginForm } from "@/components/account/LoginForm";
import { paymentProvider } from "@/server/payments";
import { Badge, Button, Card, Field, inputClass } from "@/components/ui";
import { ActionForm } from "@/components/account/ActionForm";
import { createCampaignAction, reconcileAction, runRemindersAction, toggleCampaignAction, updateLeadAction, updatePqrAction } from "./actions";
import { todayInColombia } from "@/domain/holidays";
import { buildAdminSnapshot } from "@/server/admin-snapshot";
import {
  AuditList,
  CampaignList,
  FunnelView,
  KpiCards,
  LeadList,
  ReferralLine,
  OrdersTable,
  OutboxList,
  PqrList,
  ReconView,
  SectionTitle,
} from "@/components/admin/AdminViews";
import { SalesChart } from "@/components/admin/SalesChart";
import { DiscountsPanel } from "./DiscountsPanel";
import { ExperimentsPanel } from "./ExperimentsPanel";

export const metadata: Metadata = { title: "Administración", robots: { index: false } };

const exportLink = (tipo: string, label: string) => (
  <a href={`/api/admin/exportar?tipo=${tipo}`} className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold text-brand hover:bg-brand-soft">
    {label}
  </a>
);

export default async function Page() {
  const session = await adminSession();
  if (!session) {
    const user = await getCurrentUser();
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        {user ? (
          <Card className="space-y-2 p-6">
            <h1 className="text-xl font-extrabold text-heading">Sin acceso al panel</h1>
            <p className="text-sm text-muted">La cuenta {user.email} no tiene un rol de administración.</p>
          </Card>
        ) : (
          <LoginForm next="/admin" />
        )}
      </div>
    );
  }
  const canEdit = session.role === "admin";
  const snap = buildAdminSnapshot();
  const today = todayInColombia();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-heading">Administración</h1>
        <div className="flex flex-wrap gap-2">
          <Badge tone={paymentProvider().id === "wompi" ? "mint" : "sun"}>Pagos: {paymentProvider().id}</Badge>
          <Badge tone="brand">{session.email} · {session.role}</Badge>
          {adminOpenForDemo() && <Badge tone="coral">Sin ADMIN_EMAILS (solo demo)</Badge>}
        </div>
      </div>

      <KpiCards kpis={snap.kpis} byInsurer={snap.byInsurer} />

      <Card className="p-5"><SalesChart days={snap.salesByDay} /></Card>

      <section className="space-y-3" aria-labelledby="embudo">
        <SectionTitle id="embudo" action={exportLink("eventos", "Exportar eventos (CSV)")}>Embudo de conversión</SectionTitle>
        <FunnelView funnel={snap.funnel} chosenByInsurer={snap.chosenByInsurer} />
      </section>

      <section className="space-y-3" aria-labelledby="conciliacion">
        <SectionTitle
          id="conciliacion"
          action={canEdit && (
            <form action={reconcileAction}>
              <Button variant="secondary" className="min-h-10 px-4 text-sm">Conciliar ahora</Button>
            </form>
          )}
        >
          Conciliación de pagos
        </SectionTitle>
        <ReconView report={snap.reconciliation} />
      </section>

      <section className="space-y-3" aria-labelledby="ordenes">
        <SectionTitle id="ordenes" action={exportLink("ordenes", "Exportar órdenes (CSV)")}>Órdenes</SectionTitle>
        <OrdersTable orders={snap.orders} detailHref={(ref) => `/admin/ordenes/${encodeURIComponent(ref)}`} />
      </section>

      <section className="space-y-3" aria-labelledby="oportunidades">
        <SectionTitle id="oportunidades" action={exportLink("oportunidades", "Exportar oportunidades (CSV)")}>Oportunidades</SectionTitle>
        <ReferralLine referrals={snap.referrals} />
        <LeadList
          leads={snap.leads}
          savedQuotes={snap.savedQuotes}
          form={canEdit ? (l) => l.status !== "vendida" && l.status !== "perdida" && (
            <ActionForm action={updateLeadAction.bind(null, l.id)} submitLabel="Guardar" className="space-y-2" resetOnSuccess={false}>
              <select name="status" defaultValue={l.status === "nueva" ? "contactada" : l.status} className={inputClass} aria-label={`Estado de ${l.name}`}>
                <option value="nueva">Nueva</option>
                <option value="contactada">Contactada</option>
                <option value="vendida">Vendida</option>
                <option value="perdida">Perdida</option>
              </select>
              <input name="note" placeholder="Nota (opcional)" className={inputClass} aria-label={`Nota sobre ${l.name}`} />
            </ActionForm>
          ) : undefined}
        />
      </section>

      <DiscountsPanel canEdit={canEdit} discounts={snap.discounts} />

      <ExperimentsPanel canEdit={canEdit} experiments={snap.experiments} />

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-heading">Campañas</h2>
          <CampaignList
            campaigns={snap.campaigns}
            action={canEdit ? (c) => (
              <form action={toggleCampaignAction.bind(null, c.id)}>
                <Button variant={c.active ? "secondary" : "primary"} className="min-h-10 px-4 text-sm">{c.active ? "Pausar" : "Activar"}</Button>
              </form>
            ) : undefined}
          />
          {canEdit && <Card className="p-5">
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
          </Card>}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-heading">Bandeja de salida (simulada)</h2>
            {canEdit && <form action={runRemindersAction}><Button variant="secondary" className="min-h-10 px-4 text-sm">Enviar recordatorios</Button></form>}
          </div>
          <OutboxList outbox={snap.outbox} />
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="pqrs">
        <SectionTitle id="pqrs" action={exportLink("pqr", "Exportar PQR (CSV)")}>PQR</SectionTitle>
        <PqrList
          pqrs={snap.pqrs}
          today={today}
          form={canEdit ? (q) => q.status !== "respondida" && (
            <ActionForm action={updatePqrAction.bind(null, q.id)} submitLabel="Actualizar" className="space-y-2" resetOnSuccess={false}>
              <select name="status" defaultValue={q.status === "radicada" ? "en_tramite" : "respondida"} className={inputClass} aria-label="Estado">
                <option value="en_tramite">En trámite</option>
                <option value="respondida">Respondida</option>
              </select>
              <textarea name="response" rows={3} placeholder="Respuesta al usuario (requerida para marcarla como respondida)" className={`${inputClass} py-2`} aria-label="Respuesta" />
            </ActionForm>
          ) : undefined}
        />
      </section>

      <section className="space-y-3" aria-labelledby="auditoria">
        <SectionTitle id="auditoria">Bitácora de auditoría</SectionTitle>
        <AuditList audit={snap.audit} />
      </section>
    </div>
  );
}
