import { describeRule, type DiscountRule } from "@/domain/discounts";
import { MOCK_INSURERS } from "@/insurers/mock/insurers";
import { discountConfig } from "@/server/discounts";
import { discountImpact } from "@/server/analytics";
import { db } from "@/server/db";
import { formatCOP } from "@/domain/labels";
import { Badge, Button, Card, Field, inputClass } from "@/components/ui";
import { ActionForm } from "@/components/account/ActionForm";
import {
  deleteDiscountRuleAction,
  saveDiscountRuleAction,
  saveDiscountSettingsAction,
  toggleDiscountRuleAction,
} from "./actions";

const SOURCE_LABEL = { aseguradora: "Asume la aseguradora", plataforma: "Asume SeguAlaFija" } as const;

function RuleForm({ rule, idPrefix }: { rule?: DiscountRule; idPrefix: string }) {
  const f = (name: string) => `${idPrefix}-${name}`;
  return (
    <ActionForm action={saveDiscountRuleAction} submitLabel={rule ? "Guardar cambios" : "Crear regla"} resetOnSuccess={!rule} className="space-y-3">
      {rule && <input type="hidden" name="id" value={rule.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Aseguradora" htmlFor={f("ins")}>
          <select id={f("ins")} name="insurerId" defaultValue={rule?.insurerId ?? MOCK_INSURERS[0].id} className={inputClass}>
            {MOCK_INSURERS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            <option value="*">Todas</option>
          </select>
        </Field>
        <Field label="Nombre visible" htmlFor={f("label")}>
          <input id={f("label")} name="label" required defaultValue={rule?.label} placeholder="Tarifa preferencial" className={inputClass} />
        </Field>
        <Field label="Quién lo asume" htmlFor={f("src")}>
          <select id={f("src")} name="source" defaultValue={rule?.source ?? "aseguradora"} className={inputClass}>
            <option value="aseguradora">La aseguradora (tarifa especial)</option>
            <option value="plataforma">SeguAlaFija (de la comisión)</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo" htmlFor={f("kind")}>
            <select id={f("kind")} name="kind" defaultValue={rule?.kind ?? "porcentaje"} className={inputClass}>
              <option value="porcentaje">Porcentaje</option>
              <option value="valor">Valor fijo</option>
            </select>
          </Field>
          <Field label="Magnitud" htmlFor={f("mag")} hint="% o pesos">
            <input id={f("mag")} name="magnitude" type="number" min="0" step="any" required defaultValue={rule?.magnitude} className={inputClass} />
          </Field>
        </div>
        <Field label="Tope en pesos (opcional)" htmlFor={f("max")}>
          <input id={f("max")} name="maxAmount" type="number" min="0" step="1000" defaultValue={rule?.maxAmount} className={inputClass} />
        </Field>
        <Field label="Planes (opcional)" htmlFor={f("plans")} hint="Códigos separados por coma, p. ej. auto-global">
          <input id={f("plans")} name="planCodes" defaultValue={rule?.planCodes?.join(", ")} className={inputClass} />
        </Field>
        <Field label="Desde (opcional)" htmlFor={f("from")}>
          <input id={f("from")} name="validFrom" type="date" defaultValue={rule?.validFrom} className={inputClass} />
        </Field>
        <Field label="Hasta (opcional)" htmlFor={f("until")}>
          <input id={f("until")} name="validUntil" type="date" defaultValue={rule?.validUntil} className={inputClass} />
        </Field>
      </div>
      <fieldset className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <legend className="mb-1 font-semibold text-heading">Aplica a</legend>
        {(["auto", "moto"] as const).map((t) => (
          <label key={t} className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name={`vt_${t}`} defaultChecked={!rule?.vehicleTypes?.length || rule.vehicleTypes.includes(t)} className="size-5 accent-brand" />
            {t === "auto" ? "Carros" : "Motos"}
          </label>
        ))}
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" name="enabled" defaultChecked={rule?.enabled ?? true} className="size-5 accent-brand" />
          Activa
        </label>
      </fieldset>
    </ActionForm>
  );
}

export function DiscountsPanel({ canEdit }: { canEdit: boolean }) {
  const { rules, settings } = discountConfig();
  return (
    <section className="space-y-3" aria-labelledby="descuentos">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="descuentos" className="text-lg font-bold text-heading">Descuentos y tarifas especiales</h2>
        <Badge tone={settings.enabled ? "mint" : "neutral"}>
          {settings.enabled ? `Activos · tope ${settings.maxTotalPct}%` : "Apagados"}
        </Badge>
      </div>
      <p className="text-sm text-muted">
        De cada fuente se aplica la regla más favorable; las de la aseguradora y las de SeguAlaFija se suman hasta el
        tope total. Si se supera, se recorta primero lo que asume SeguAlaFija. Los cambios rigen en la siguiente cotización.
      </p>

      {canEdit && (
        <Card className="p-5">
          <ActionForm action={saveDiscountSettingsAction} submitLabel="Guardar configuración" resetOnSuccess={false} className="flex flex-wrap items-end gap-4">
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-heading">
              <input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="size-5 accent-brand" />
              Descuentos activos (interruptor general)
            </label>
            <Field label="Descuento total máximo (%)" htmlFor="d-max">
              <input id="d-max" name="maxTotalPct" type="number" min="0" max="50" step="0.5" defaultValue={settings.maxTotalPct} className={`${inputClass} w-32`} />
            </Field>
          </ActionForm>
        </Card>
      )}

      <Card className="divide-y divide-line">
        {rules.length === 0 && <p className="p-4 text-sm text-muted">Sin reglas.</p>}
        {rules.map((r) => (
          <div key={r.id} className="space-y-2 p-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-heading">{r.label}</p>
                <p className="text-sm text-muted">{describeRule(r)}</p>
              </div>
              <Badge tone={r.source === "plataforma" ? "sun" : "brand"}>{SOURCE_LABEL[r.source]}</Badge>
              {canEdit ? (
                <div className="flex gap-2">
                  <form action={toggleDiscountRuleAction.bind(null, r.id)}>
                    <Button variant={r.enabled ? "secondary" : "primary"} className="min-h-10 px-4 text-sm">{r.enabled ? "Apagar" : "Prender"}</Button>
                  </form>
                  <form action={deleteDiscountRuleAction.bind(null, r.id)}>
                    <Button variant="ghost" className="min-h-10 px-3 text-sm" aria-label={`Eliminar ${r.label}`}>Eliminar</Button>
                  </form>
                </div>
              ) : (
                <Badge tone={r.enabled ? "mint" : "neutral"}>{r.enabled ? "Activa" : "Apagada"}</Badge>
              )}
            </div>
            {canEdit && (
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-brand">Editar parámetros</summary>
                <div className="mt-3"><RuleForm rule={r} idPrefix={`r-${r.id}`} /></div>
              </details>
            )}
          </div>
        ))}
      </Card>

      <ImpactTable labels={Object.fromEntries(rules.map((r) => [r.id, r.label]))} />

      {canEdit && (
        <Card className="p-5">
          <h3 className="mb-3 font-bold text-heading">Nueva regla</h3>
          <RuleForm idPrefix="nueva" />
        </Card>
      )}
    </section>
  );
}

function ImpactTable({ labels }: { labels: Record<string, string> }) {
  const rows = discountImpact([...db().orders.values()], labels);
  const pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);
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
              <th scope="col" className="py-2 font-medium">Descuento</th>
              <th scope="col" className="py-2 text-right font-medium">Elegidas</th>
              <th scope="col" className="py-2 text-right font-medium">Órdenes</th>
              <th scope="col" className="py-2 text-right font-medium">Pagadas</th>
              <th scope="col" className="py-2 text-right font-medium">Conversión</th>
              <th scope="col" className="py-2 text-right font-medium">Costo</th>
              <th scope="col" className="py-2 text-right font-medium">Prima cobrada</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-line">
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  <span className="font-semibold text-ink">{r.label}</span>
                  {r.source && <span className="block text-xs text-muted">{SOURCE_LABEL[r.source]}</span>}
                </th>
                <td className="py-2 text-right">{r.chosen}</td>
                <td className="py-2 text-right">{r.orders}</td>
                <td className="py-2 text-right">{r.paid}</td>
                <td className="py-2 text-right font-semibold">{pct(r.conversion)}</td>
                <td className="py-2 text-right">{formatCOP(r.granted)}</td>
                <td className="py-2 text-right">{formatCOP(r.premium)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
