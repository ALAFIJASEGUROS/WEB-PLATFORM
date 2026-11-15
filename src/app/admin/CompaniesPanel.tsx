import { Building2 } from "lucide-react";
import { DEFAULT_TIERS, nextTier, PAYMENT_MODEL_LABELS, tierFor, type Company } from "@/domain/companies";
import { formatCOP } from "@/domain/labels";
import { ACTIVE_CONFIGS } from "@/insurers/mock/insurers";
import { Badge, Button, Card, Field, inputClass } from "@/components/ui";
import { ActionForm } from "@/components/account/ActionForm";
import { rotateJoinCodeAction, saveCompanyAction } from "./actions";

export interface CompanyRow {
  company: Company;
  enrolled: number;
  pending: number;
}

const TIER_ROWS = 6;
const PLANS = ACTIVE_CONFIGS.flatMap((c) => c.plans.map((p) => ({ code: p.code, name: p.name, insurer: c.name, type: p.vehicleType })));

function CompanyForm({ company, idPrefix }: { company?: Company; idPrefix: string }) {
  const f = (name: string) => `${idPrefix}-${name}`;
  const tiers = company?.tiers ?? DEFAULT_TIERS;
  return (
    <ActionForm action={saveCompanyAction} submitLabel={company ? "Guardar cambios" : "Crear empresa"} resetOnSuccess={!company} className="space-y-4">
      {company && <input type="hidden" name="id" value={company.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre" htmlFor={f("name")}>
          <input id={f("name")} name="name" required defaultValue={company?.name} className={inputClass} />
        </Field>
        <Field label="NIT (opcional)" htmlFor={f("nit")}>
          <input id={f("nit")} name="nit" defaultValue={company?.nit} className={inputClass} />
        </Field>
        <Field label="Dirección del portal (opcional)" htmlFor={f("slug")} hint="Se genera del nombre si la dejas vacía">
          <input id={f("slug")} name="slug" defaultValue={company?.slug} placeholder="andina-logistica" className={inputClass} />
        </Field>
        <Field label="Dominios de correo" htmlFor={f("domains")} hint="Separados por coma, p. ej. andina.com.co">
          <input id={f("domains")} name="domains" defaultValue={company?.emailDomains.join(", ")} className={inputClass} />
        </Field>
        <Field label="Quién paga" htmlFor={f("pay")}>
          <select id={f("pay")} name="paymentModel" defaultValue={company?.paymentModel ?? "empleado"} className={inputClass}>
            {Object.entries(PAYMENT_MODEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Aporte de la empresa en copago (COP al año)" htmlFor={f("copay")} hint="Solo si eligió copago">
          <input id={f("copay")} name="copayAmount" type="number" min="0" step="10000" defaultValue={company?.copayAmount} className={inputClass} />
        </Field>
        <Field label="Logo (opcional)" htmlFor={f("logo")} hint="PNG, JPG, WebP o SVG de hasta 200 KB">
          <input id={f("logo")} name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="block w-full text-sm" />
        </Field>
        <Field label="Estado" htmlFor={f("status")}>
          <select id={f("status")} name="status" defaultValue={company?.status ?? "activa"} className={inputClass}>
            <option value="activa">Activa</option>
            <option value="pausada">Pausada (no aplica tarifa corporativa)</option>
          </select>
        </Field>
      </div>
      {company?.logo && (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="removeLogo" className="size-5 accent-brand" /> Quitar el logo actual
        </label>
      )}

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold text-heading">Planes habilitados</legend>
        <p className="text-xs text-muted">Si no marcas ninguno, los empleados ven todos los planes.</p>
        <div className="grid gap-x-6 sm:grid-cols-2">
          {PLANS.map((p) => (
            <label key={p.code} className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="plans" value={p.code} defaultChecked={company?.allowedPlanCodes.includes(p.code)} className="size-5 accent-brand" />
              {p.name} <span className="text-muted">· {p.type === "auto" ? "carro" : "moto"}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold text-heading">Tramos de precio por volumen</legend>
        <p className="text-xs text-muted">Desde cuántos empleados inscritos y qué descuento aplica. Deja vacías las filas que no uses.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[0, 1].map((col) => (
            <div key={col} className={`grid grid-cols-2 gap-2 text-xs font-semibold text-muted ${col === 1 ? "hidden sm:grid" : ""}`} aria-hidden>
              <span>Desde (empleados)</span>
              <span>Descuento (%)</span>
            </div>
          ))}
          {Array.from({ length: TIER_ROWS }, (_, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <input name={`tier_min_${i}`} type="number" min="1" aria-label={`Tramo ${i + 1}: desde cuántos empleados`} placeholder="Desde (empleados)" defaultValue={tiers[i]?.minEmployees} className={inputClass} />
              <input name={`tier_pct_${i}`} type="number" min="0.5" max="50" step="0.5" aria-label={`Tramo ${i + 1}: descuento en porcentaje`} placeholder="Descuento %" defaultValue={tiers[i]?.discountPct} className={inputClass} />
            </div>
          ))}
        </div>
      </fieldset>
    </ActionForm>
  );
}

export function CompaniesPanel({ canEdit, rows }: { canEdit: boolean; rows: CompanyRow[] }) {
  return (
    <section className="space-y-3" aria-labelledby="empresas">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="empresas" className="text-lg font-bold text-heading">Empresas (beneficio para empleados)</h2>
        <a href="/empresas" className="text-sm font-semibold text-brand hover:underline">Ver página para empresas</a>
      </div>
      <p className="text-sm text-muted">
        Cada empresa tiene su tarifa corporativa por tramos. El tramo se calcula con los empleados aprobados. Los tramos
        son simulados hasta negociarlos con Seguros Bolívar.
      </p>

      <Card className="divide-y divide-line">
        {rows.length === 0 && <p className="p-4 text-sm text-muted">Aún no hay empresas.</p>}
        {rows.map(({ company: c, enrolled, pending }) => {
          const tier = tierFor(enrolled, c.tiers);
          const next = nextTier(enrolled, c.tiers);
          return (
            <div key={c.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-start gap-3">
                {c.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- logo en data URL
                  <img src={c.logo} alt="" className="size-11 shrink-0 rounded-xl border border-line bg-white object-contain p-1" />
                ) : (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand" aria-hidden>
                    <Building2 className="size-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-heading">{c.name}</p>
                  <p className="break-words text-sm text-muted">
                    /empresas/{c.slug} · código <span className="font-mono font-semibold text-ink">{c.joinCode}</span>
                    {c.emailDomains.length > 0 && <> · @{c.emailDomains.join(", @")}</>}
                  </p>
                  <p className="text-sm text-muted">
                    {PAYMENT_MODEL_LABELS[c.paymentModel]}
                    {c.paymentModel === "copago" && c.copayAmount ? ` (${formatCOP(c.copayAmount)} al año)` : ""}
                    {" · "}
                    {c.allowedPlanCodes.length ? `${c.allowedPlanCodes.length} planes habilitados` : "todos los planes"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.demo && <Badge tone="neutral">Demo</Badge>}
                  <Badge tone={c.status === "activa" ? "mint" : "neutral"}>{c.status === "activa" ? "Activa" : "Pausada"}</Badge>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div><dt className="text-muted">Inscritos</dt><dd className="font-bold tabular-nums text-heading">{enrolled}</dd></div>
                <div><dt className="text-muted">Pendientes</dt><dd className="font-bold tabular-nums text-heading">{pending}</dd></div>
                <div><dt className="text-muted">Tramo actual</dt><dd className="font-bold text-heading">{tier ? `${tier.discountPct} %` : "Sin tramo"}</dd></div>
                <div>
                  <dt className="text-muted">Siguiente</dt>
                  <dd className="font-bold text-heading">{next ? `${next.tier.discountPct} % · faltan ${next.missing}` : "Tramo máximo"}</dd>
                </div>
              </dl>
              {canEdit && (
                <div className="flex flex-wrap items-center gap-3">
                  <details className="min-w-0 flex-1">
                    <summary className="cursor-pointer text-sm font-semibold text-brand">Editar empresa</summary>
                    <div className="mt-3"><CompanyForm company={c} idPrefix={`co-${c.id}`} /></div>
                  </details>
                  <form action={rotateJoinCodeAction.bind(null, c.id)}>
                    <Button variant="secondary" className="min-h-10 px-4 text-sm">Cambiar código</Button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </Card>

      {canEdit && (
        <Card className="p-5">
          <h3 className="mb-3 font-bold text-heading">Nueva empresa</h3>
          <CompanyForm idPrefix="nueva-empresa" />
        </Card>
      )}
    </section>
  );
}
