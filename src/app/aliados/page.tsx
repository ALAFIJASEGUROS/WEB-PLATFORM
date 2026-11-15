import type { Metadata } from "next";
import { Activity, Megaphone } from "lucide-react";
import { formatCOP } from "@/domain/labels";
import { getCurrentUser } from "@/server/auth";
import { insurerHealthReport } from "@/server/insurer-health";
import { insurerCampaigns, insurerMetrics, insurerSession, type InsurerCampaignStatus } from "@/server/insurer-portal";
import { LoginForm } from "@/components/account/LoginForm";
import { ActionForm } from "@/components/account/ActionForm";
import { Badge, Button, Card, Field, inputClass, InsurerLogo } from "@/components/ui";
import { proposeCampaignAction, toggleCampaignAction } from "./actions";

export const metadata: Metadata = { title: "Portal de aseguradoras", robots: { index: false } };

const STATUS: Record<InsurerCampaignStatus, { label: string; tone: "sun" | "mint" | "neutral" }> = {
  en_revision: { label: "En revisión de SeguAlaFija", tone: "sun" },
  activa: { label: "Publicada", tone: "mint" },
  pausada: { label: "Pausada", tone: "neutral" },
};
const AUDIENCE = { todos: "Todos", auto: "Carros", moto: "Motos" } as const;
const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)} %`);

export default async function Page() {
  const session = await insurerSession();
  if (!session) {
    const user = await getCurrentUser();
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-12">
        <h1 className="text-xl font-extrabold text-heading">Portal de aseguradoras</h1>
        {user ? (
          <Card className="space-y-2 p-6">
            <p className="font-semibold text-heading">Sin acceso</p>
            <p className="text-sm text-muted">La cuenta {user.email} no está habilitada como aseguradora aliada. Escríbenos para darte acceso.</p>
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted">Para aseguradoras aliadas de SeguAlaFija: tus métricas y tus campañas.</p>
            <LoginForm next="/aliados" />
          </>
        )}
      </div>
    );
  }

  const { insurerId, insurerName, user } = session;
  const m = insurerMetrics(insurerId);
  const campaigns = insurerCampaigns(insurerId);
  const health = (await insurerHealthReport()).find((r) => r.id === insurerId);
  const kpis = [
    ["Sesiones que vieron resultados", String(m.resultsViewed)],
    ["Eligieron una oferta tuya", String(m.chosen)],
    ["Pólizas pagadas", String(m.paid)],
    ["De elegir a pagar", pct(m.conversion)],
    ["Pólizas vigentes", String(m.policies)],
    ["Prima anual emitida", formatCOP(m.premium)],
    ["Prima promedio", m.policies ? formatCOP(m.averagePremium) : "—"],
    ["Por beneficio de empresas", String(m.corporate)],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 pb-28 pt-6 md:pb-10">
      <header className="flex flex-wrap items-center gap-4">
        <InsurerLogo id={insurerId} name={insurerName} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-muted">Portal de aseguradoras</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-heading">{insurerName}</h1>
          <p className="mt-1 break-words text-sm text-muted">{user.email}</p>
        </div>
      </header>
      <p className="rounded-xl bg-sun-soft p-3 text-sm text-sun-ink">
        Datos de demostración: las métricas salen de la operación simulada de la plataforma. No incluyen datos personales de los clientes.
      </p>

      <section aria-label="Métricas" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="break-words text-xl font-extrabold tabular-nums text-heading">{value}</p>
          </Card>
        ))}
      </section>

      <section aria-labelledby="planes" className="space-y-3">
        <h2 id="planes" className="text-lg font-bold text-heading">Pólizas por plan</h2>
        <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[28rem] text-sm">
            <caption className="sr-only">Pólizas vigentes y prima anual por plan</caption>
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="p-3">Plan</th>
                <th scope="col" className="p-3 text-right">Pólizas</th>
                <th scope="col" className="p-3 text-right">Prima anual</th>
              </tr>
            </thead>
            <tbody>
              {m.byPlan.length === 0 && (
                <tr><td colSpan={3} className="p-3 text-muted">Aún no hay pólizas emitidas.</td></tr>
              )}
              {m.byPlan.map((r) => (
                <tr key={r.plan} className="border-b border-line last:border-0">
                  <th scope="row" className="p-3 text-left font-semibold">{r.plan}</th>
                  <td className="p-3 text-right tabular-nums">{r.policies}</td>
                  <td className="p-3 text-right tabular-nums">{formatCOP(r.premium)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {health && (
        <section aria-labelledby="salud" className="space-y-3">
          <h2 id="salud" className="flex items-center gap-2 text-lg font-bold text-heading"><Activity className="size-5 text-brand" aria-hidden /> Salud de tu integración</h2>
          <Card className="grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-4">
            <div><p className="text-muted">Conexión</p><p className="font-bold text-heading">{health.probe ? (health.probe.ok ? "OK" : "Sin conexión") : "—"}</p></div>
            <div><p className="text-muted">Latencia p95</p><p className="font-bold tabular-nums text-heading">{health.metrics.p95Ms !== undefined ? `${health.metrics.p95Ms} ms` : "—"}</p></div>
            <div><p className="text-muted">Errores</p><p className="font-bold tabular-nums text-heading">{pct(health.metrics.errorRate)}</p></div>
            <div><p className="text-muted">Timeouts</p><p className="font-bold tabular-nums text-heading">{pct(health.metrics.timeoutRate)}</p></div>
          </Card>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2 [&>*]:min-w-0">
        <section aria-labelledby="campanas" className="space-y-3">
          <h2 id="campanas" className="flex items-center gap-2 text-lg font-bold text-heading"><Megaphone className="size-5 text-brand" aria-hidden /> Tus campañas</h2>
          {campaigns.length === 0 && <Card className="p-4 text-sm text-muted">Aún no tienes campañas.</Card>}
          {campaigns.map((c) => (
            <Card key={c.id} className="space-y-2 p-4 text-sm">
              <div className="flex flex-wrap items-start gap-2">
                <p className="mr-auto font-semibold text-heading">{c.title}</p>
                <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
              </div>
              <p className="text-muted">{c.body}</p>
              <p className="text-muted">Audiencia: {AUDIENCE[c.audience]} · <strong className="tabular-nums text-heading">{c.clicks} {c.clicks === 1 ? "clic" : "clics"}</strong></p>
              {c.status !== "en_revision" && (
                <form action={toggleCampaignAction.bind(null, c.id)}>
                  <Button variant="secondary" className="min-h-10 px-4 text-sm">{c.active ? "Pausar" : "Reanudar"}</Button>
                </form>
              )}
            </Card>
          ))}
        </section>

        <section aria-labelledby="nueva-campana" className="space-y-3">
          <h2 id="nueva-campana" className="text-lg font-bold text-heading">Proponer una campaña</h2>
          <Card className="p-5">
            <ActionForm action={proposeCampaignAction} submitLabel="Enviar a revisión" className="space-y-3">
              <Field label="Título" htmlFor="ic-t"><input id="ic-t" name="title" required className={inputClass} /></Field>
              <Field label="Mensaje" htmlFor="ic-b"><textarea id="ic-b" name="body" required rows={3} className={`${inputClass} py-3`} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Texto del botón" htmlFor="ic-cl"><input id="ic-cl" name="ctaLabel" required className={inputClass} /></Field>
                <Field label="Enlace" htmlFor="ic-cu"><input id="ic-cu" name="ctaUrl" required placeholder="https://" className={inputClass} /></Field>
              </div>
              <Field label="Audiencia" htmlFor="ic-a">
                <select id="ic-a" name="audience" className={inputClass}>
                  <option value="todos">Todos</option>
                  <option value="auto">Dueños de carro</option>
                  <option value="moto">Dueños de moto</option>
                </select>
              </Field>
              <p className="text-xs text-muted">SeguAlaFija revisa cada campaña antes de publicarla. Solo la ven quienes autorizaron recibir ofertas.</p>
            </ActionForm>
          </Card>
        </section>
      </div>
    </div>
  );
}
