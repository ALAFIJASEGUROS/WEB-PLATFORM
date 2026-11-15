import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Download } from "lucide-react";
import {
  MEMBERSHIP_STATUS_LABELS,
  nextTier,
  PAYMENT_MODEL_LABELS,
  splitPremium,
  teamSavings,
  tierFor,
  type Company,
  type MembershipStatus,
} from "@/domain/companies";
import { formatCOP } from "@/domain/labels";
import { ACTIVE_CONFIGS } from "@/insurers/mock/insurers";
import { getCurrentUser } from "@/server/auth";
import { companyAuditFor, companyRole, findCompanyBySlug, membersOf } from "@/server/companies";
import { LoginForm } from "@/components/account/LoginForm";
import { ActionForm } from "@/components/account/ActionForm";
import { Badge, Card, Field, inputClass } from "@/components/ui";
import { DecisionForm } from "@/components/benefit/DecisionForm";
import { decideAction, inviteAction, programAction } from "./actions";

export const metadata: Metadata = { title: "Panel de la empresa", robots: { index: false } };

const PLANS = ACTIVE_CONFIGS.flatMap((c) => c.plans.map((p) => ({ code: p.code, name: p.name, type: p.vehicleType })));
const STATUS_TONE: Record<MembershipStatus, "mint" | "sun" | "neutral" | "brand" | "coral"> = {
  aprobado: "mint",
  pendiente: "sun",
  invitado: "brand",
  rechazado: "neutral",
  retirado: "neutral",
};
const when = (iso: string) => iso.slice(0, 16).replace("T", " ");

export default async function Page({ params }: PageProps<"/empresas/[slug]/admin">) {
  const { slug } = await params;
  const company = findCompanyBySlug(slug);
  if (!company) notFound();
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-12">
        <h1 className="text-xl font-extrabold text-heading">Panel de {company.name}</h1>
        <LoginForm next={`/empresas/${company.slug}/admin`} />
      </div>
    );
  }
  const role = companyRole(company, user);
  if (!role) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="space-y-2 p-6">
          <h1 className="text-xl font-extrabold text-heading">Sin acceso al panel</h1>
          <p className="text-sm text-muted">La cuenta {user.email} no administra el beneficio de {company.name}. Pide acceso a SeguAlaFija.</p>
          <Link href={`/empresas/${company.slug}`} className="text-sm font-semibold text-brand hover:underline">Ir al portal del empleado</Link>
        </Card>
      </div>
    );
  }
  const canEdit = role === "admin";
  const members = membersOf(company.id);
  const count = (s: MembershipStatus) => members.filter((m) => m.status === s).length;
  const enrolled = count("aprobado");
  const tier = tierFor(enrolled, company.tiers);
  const next = nextTier(enrolled, company.tiers);
  const pending = members.filter((m) => m.status === "pendiente");
  const chosen = members.filter((m) => m.status === "aprobado" && m.selection).length;

  const kpis = [
    ["Inscritos", String(enrolled)],
    ["Pendientes", String(pending.length)],
    ["Invitados sin entrar", String(count("invitado"))],
    ["Tramo actual", tier ? `${tier.discountPct} %` : "Sin tramo"],
    ["Siguiente tramo", next ? `${next.tier.discountPct} % · faltan ${next.missing}` : "Máximo"],
    ["Ahorro anual del equipo", formatCOP(teamSavings(members))],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <Link href={`/empresas/${company.slug}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted hover:text-heading">
        <ArrowLeft className="size-4" aria-hidden /> Portal del empleado
      </Link>
      <header className="flex flex-wrap items-center gap-4">
        {company.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo en data URL
          <img src={company.logo} alt="" className="size-14 shrink-0 rounded-2xl border border-line bg-white object-contain p-2" />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand" aria-hidden><Building2 className="size-6" /></span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-muted">Panel de la empresa</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-heading">{company.name}</h1>
          <p className="mt-1 break-words text-sm text-muted">{user.email} · {canEdit ? "administrador" : "solo lectura"}</p>
        </div>
      </header>

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {kpis.map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="break-words text-xl font-extrabold tabular-nums text-heading">{value}</p>
          </Card>
        ))}
      </section>
      <p className="-mt-4 text-sm text-muted">
        {chosen} de {enrolled} inscritos ya eligieron plan. {PAYMENT_MODEL_LABELS[company.paymentModel]}
        {company.paymentModel === "copago" && company.copayAmount ? ` (${formatCOP(company.copayAmount)} al año por persona)` : ""}.
      </p>

      <section aria-labelledby="pendientes" className="space-y-3">
        <h2 id="pendientes" className="text-lg font-bold text-heading">Vinculaciones por aprobar</h2>
        <Card>
          {canEdit ? (
            <DecisionForm
              action={decideAction.bind(null, company.slug)}
              rows={pending.map((m) => ({ id: m.id, name: m.name, email: m.email, source: m.source, plan: m.selection?.planName }))}
            />
          ) : (
            <p className="p-4 text-sm text-muted">{pending.length} pendientes. Solo los administradores pueden aprobar.</p>
          )}
        </Card>
      </section>

      <section aria-labelledby="empleados" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="empleados" className="text-lg font-bold text-heading">Empleados</h2>
          <a href={`/api/empresas/${company.slug}/reporte`} className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-brand hover:bg-brand-soft">
            <Download className="size-4" aria-hidden /> Reporte para nómina (CSV)
          </a>
        </div>
        <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[40rem] text-sm">
            <caption className="sr-only">Empleados vinculados, su estado y plan elegido</caption>
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="p-3">Empleado</th>
                <th scope="col" className="p-3">Estado</th>
                <th scope="col" className="p-3">Plan</th>
                <th scope="col" className="p-3 text-right">Prima anual</th>
                <th scope="col" className="p-3 text-right">Paga el empleado</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <th scope="row" className="p-3 text-left font-normal">
                    <span className="block font-semibold text-heading">{m.name ?? m.email}</span>
                    {m.name && <span className="block text-muted">{m.email}</span>}
                  </th>
                  <td className="p-3"><Badge tone={STATUS_TONE[m.status]}>{MEMBERSHIP_STATUS_LABELS[m.status]}</Badge></td>
                  <td className="p-3">{m.selection ? `${m.selection.planName} · ${m.selection.vehicleType === "auto" ? "carro" : "moto"}` : <span className="text-muted">Sin elegir</span>}</td>
                  <td className="p-3 text-right tabular-nums">{m.selection ? formatCOP(m.selection.estimatedPremium) : "—"}</td>
                  <td className="p-3 text-right tabular-nums">{m.selection ? formatCOP(splitPremium(company, m.selection.estimatedPremium).employeePart) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">Por privacidad no mostramos la placa, la fecha de nacimiento ni las respuestas que cada persona dio para cotizar.</p>
      </section>

      {canEdit && (
        <div className="grid gap-6 md:grid-cols-2 [&>*]:min-w-0">
          <section aria-labelledby="invitar" className="space-y-3">
            <h2 id="invitar" className="text-lg font-bold text-heading">Invitar empleados</h2>
            <Card className="p-5">
              <ActionForm action={inviteAction.bind(null, company.slug)} submitLabel="Enviar invitaciones" successMessage="Invitaciones enviadas." className="space-y-3">
                <Field label="Lista de empleados" htmlFor="inv-list" hint="Una persona por línea: nombre, correo. También sirve solo el correo.">
                  <textarea id="inv-list" name="list" rows={5} placeholder={"Ana Gómez, ana@empresa.co\nluis@empresa.co"} className={`${inputClass} py-2 font-mono text-sm`} />
                </Field>
                <Field label="O sube un archivo CSV" htmlFor="inv-file" hint="Hasta 200 KB y 1.000 personas">
                  <input id="inv-file" name="file" type="file" accept=".csv,text/csv,text/plain" className="block w-full text-sm" />
                </Field>
                <p className="text-xs text-muted">Cada persona recibe un correo con el enlace. Cuenta para el tramo cuando entra con ese correo.</p>
              </ActionForm>
            </Card>
          </section>

          <section aria-labelledby="programa" className="space-y-3">
            <h2 id="programa" className="text-lg font-bold text-heading">Programa</h2>
            <Card className="p-5">
              <ProgramForm company={company} />
            </Card>
          </section>
        </div>
      )}

      <section aria-labelledby="bitacora" className="space-y-3">
        <h2 id="bitacora" className="text-lg font-bold text-heading">Bitácora</h2>
        <Card className="divide-y divide-line">
          {companyAuditFor(company.id).length === 0 && <p className="p-4 text-sm text-muted">Sin movimientos.</p>}
          {companyAuditFor(company.id).map((e) => (
            <p key={e.id} className="break-words p-3 text-sm">
              <span className="tabular-nums text-muted">{when(e.at)} UTC</span> · <strong className="text-heading">{e.action}</strong>
              {e.detail && ` · ${e.detail}`} <span className="text-muted">({e.actor})</span>
            </p>
          ))}
        </Card>
      </section>
    </div>
  );
}

function ProgramForm({ company }: { company: Company }) {
  return (
    <ActionForm action={programAction.bind(null, company.slug)} submitLabel="Guardar programa" resetOnSuccess={false} className="space-y-4">
      <Field label="Quién paga" htmlFor="pr-pay">
        <select id="pr-pay" name="paymentModel" defaultValue={company.paymentModel} className={inputClass}>
          {Object.entries(PAYMENT_MODEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      <Field label="Aporte de la empresa en copago (COP al año por persona)" htmlFor="pr-copay" hint="Solo si eligió copago">
        <input id="pr-copay" name="copayAmount" type="number" min="0" step="10000" defaultValue={company.copayAmount} className={inputClass} />
      </Field>
      <Field label="Cierre de la inscripción" htmlFor="pr-close" hint="Ese día se fija el tramo y el precio final">
        <input id="pr-close" name="enrollmentClosesAt" type="date" defaultValue={company.enrollmentClosesAt} className={inputClass} />
      </Field>
      <fieldset className="space-y-1">
        <legend className="mb-1 text-sm font-semibold text-heading">Planes habilitados</legend>
        <p className="text-xs text-muted">Si no marcas ninguno, se ofrecen todos.</p>
        {PLANS.map((p) => (
          <label key={p.code} className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="plans" value={p.code} defaultChecked={company.allowedPlanCodes.includes(p.code)} className="size-5 accent-brand" />
            {p.name} <span className="text-muted">· {p.type === "auto" ? "carro" : "moto"}</span>
          </label>
        ))}
      </fieldset>
      <p className="text-xs text-muted">Los tramos de descuento y los dominios de correo los define SeguAlaFija con la aseguradora.</p>
    </ActionForm>
  );
}
