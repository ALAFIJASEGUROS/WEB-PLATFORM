import Link from "next/link";
import { redirect } from "next/navigation";
import { Bike, CarFront, Trash2 } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { daysUntil, userPolicies, userVehicles } from "@/server/queries";
import type { Policy } from "@/server/db";
import { formatCOP } from "@/domain/labels";
import { Badge, Button, ButtonLink, Card, Field, InsurerLogo, inputClass } from "@/components/ui";
import { ActionForm } from "@/components/account/ActionForm";
import {
  addExternalPolicyAction,
  deletePolicyAction,
  payInstallmentAction,
  deleteVehicleAction,
  saveVehicleAction,
} from "../actions";

function InstallmentPlan({ policy }: { policy: Policy }) {
  const list = policy.installments!;
  const paid = list.filter((i) => i.status === "pagada").length;
  const next = list.find((i) => i.status === "pendiente");
  return (
    <div className="space-y-2 rounded-2xl bg-canvas p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-heading">Cuotas pagadas {paid} de {list.length}</span>
        {next && <span className="text-muted">Próxima: {next.dueDate}</span>}
      </div>
      <div className="flex gap-1" aria-hidden>
        {list.map((i) => (
          <span key={i.n} className={`h-1.5 flex-1 rounded-full ${i.status === "pagada" ? "bg-mint" : "bg-line"}`} />
        ))}
      </div>
      {next && (
        <form action={payInstallmentAction.bind(null, policy.id)}>
          <Button type="submit" variant="secondary" className="min-h-10 w-full px-4 text-sm">
            Pagar cuota {next.n} · {formatCOP(next.amount)}
          </Button>
        </form>
      )}
    </div>
  );
}

export default async function Page({ searchParams }: PageProps<"/cuenta/seguros">) {
  const { cuota, error } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/cuenta");
  const policies = userPolicies(user.id);
  const vehicles = userVehicles(user.id);

  return (
    <div className="space-y-10">
      <section aria-labelledby="polizas" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 id="polizas" className="text-2xl font-extrabold tracking-tight text-heading">Mis pólizas</h1>
          <ButtonLink href="/cotizar" variant="secondary" className="min-h-10 px-4 text-sm">Cotizar otra</ButtonLink>
        </div>
        {typeof cuota === "string" && <p role="status" className="rounded-xl bg-mint-soft p-3 text-sm font-medium text-mint">Pagaste la cuota {cuota}. Te enviamos el comprobante por correo.</p>}
        {typeof error === "string" && <p role="alert" className="rounded-xl bg-coral-soft p-3 text-sm text-coral">{error}</p>}
        {policies.length === 0 && <p className="text-muted">Todavía no tienes pólizas registradas.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {policies.map((p) => {
            const left = daysUntil(p.endDate);
            return (
              <Card key={p.id} className="space-y-3 p-5">
                <div className="flex items-start gap-3">
                  <InsurerLogo id={p.insurerId} name={p.insurerName} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-heading">{p.planName}</p>
                    <p className="text-sm text-muted">{p.insurerName} · {p.vehicle.plate}</p>
                  </div>
                  {left < 0 ? <Badge tone="coral">Vencida</Badge> : left <= 30 ? <Badge tone="sun">Vence en {left} días</Badge> : <Badge tone="mint">Vigente</Badge>}
                </div>
                <p className="text-sm text-muted">Nº {p.number} · {p.startDate} a {p.endDate}</p>
                {p.installments && <InstallmentPlan policy={p} />}
                <div className="flex flex-wrap gap-2">
                  {p.source === "compra" ? (
                    <Link href={`/poliza/${p.id}`} className="text-sm font-semibold text-brand underline">Ver póliza</Link>
                  ) : (
                    <>
                      <Badge tone="neutral">Registrada por ti</Badge>
                      <form action={deletePolicyAction.bind(null, p.id)}>
                        <button className="inline-flex items-center gap-1 text-sm text-muted hover:text-coral"><Trash2 className="size-4" aria-hidden />Eliminar</button>
                      </form>
                    </>
                  )}
                  {left <= 45 && (
                    <Link href={`/cotizar/${p.vehicle.type}`} className="text-sm font-semibold text-brand underline">Comparar para renovar</Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section id="vehiculos" aria-labelledby="veh" className="space-y-4">
        <h2 id="veh" className="text-xl font-extrabold text-heading">Mis vehículos</h2>
        <p className="text-sm text-muted">Agrega las fechas de SOAT y tecnomecánica y te recordamos antes de que venzan.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {vehicles.map((v) => (
            <Card key={v.id} className="space-y-3 p-5">
              <div className="flex items-center gap-3">
                {v.type === "moto" ? <Bike className="size-6 text-brand" aria-hidden /> : <CarFront className="size-6 text-brand" aria-hidden />}
                <p className="flex-1 font-bold text-heading">{v.plate} · {v.brand} {v.model} {v.year}</p>
                <form action={deleteVehicleAction.bind(null, v.id)}>
                  <button aria-label={`Eliminar ${v.plate}`} className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-coral-soft hover:text-coral"><Trash2 className="size-4" aria-hidden /></button>
                </form>
              </div>
              <ActionForm action={saveVehicleAction} submitLabel="Guardar fechas" resetOnSuccess={false} className="space-y-3">
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="plate" value={v.plate} />
                <input type="hidden" name="brand" value={v.brand} />
                <input type="hidden" name="model" value={v.model} />
                <input type="hidden" name="year" value={v.year} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Vence SOAT" htmlFor={`soat-${v.id}`}>
                    <input id={`soat-${v.id}`} name="soatExpiry" type="date" defaultValue={v.soatExpiry} className={inputClass} />
                  </Field>
                  <Field label="Vence tecnomecánica" htmlFor={`rtm-${v.id}`}>
                    <input id={`rtm-${v.id}`} name="rtmExpiry" type="date" defaultValue={v.rtmExpiry} className={inputClass} />
                  </Field>
                </div>
              </ActionForm>
            </Card>
          ))}
        </div>

        <details className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
          <summary className="cursor-pointer font-semibold text-heading">+ Agregar vehículo</summary>
          <ActionForm action={saveVehicleAction} submitLabel="Agregar vehículo" className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Placa" htmlFor="nv-plate"><input id="nv-plate" name="plate" required className={`${inputClass} uppercase`} placeholder="ABC123" /></Field>
            <Field label="Marca" htmlFor="nv-brand"><input id="nv-brand" name="brand" required className={inputClass} /></Field>
            <Field label="Línea" htmlFor="nv-model"><input id="nv-model" name="model" required className={inputClass} /></Field>
            <Field label="Año" htmlFor="nv-year"><input id="nv-year" name="year" type="number" inputMode="numeric" required className={inputClass} /></Field>
            <Field label="Vence SOAT (opcional)" htmlFor="nv-soat"><input id="nv-soat" name="soatExpiry" type="date" className={inputClass} /></Field>
            <Field label="Vence tecnomecánica (opcional)" htmlFor="nv-rtm"><input id="nv-rtm" name="rtmExpiry" type="date" className={inputClass} /></Field>
          </ActionForm>
        </details>

        {vehicles.length > 0 && (
          <details className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
            <summary className="cursor-pointer font-semibold text-heading">+ Registrar una póliza que ya tengo</summary>
            <ActionForm action={addExternalPolicyAction} submitLabel="Registrar póliza" className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Aseguradora" htmlFor="ep-ins"><input id="ep-ins" name="insurerName" required className={inputClass} /></Field>
              <Field label="Producto o plan" htmlFor="ep-plan"><input id="ep-plan" name="planName" required className={inputClass} /></Field>
              <Field label="Número de póliza" htmlFor="ep-num"><input id="ep-num" name="number" required className={inputClass} /></Field>
              <Field label="Vehículo" htmlFor="ep-veh">
                <select id="ep-veh" name="vehicleId" required className={inputClass}>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} · {v.brand} {v.model}</option>)}
                </select>
              </Field>
              <Field label="Inicio de vigencia" htmlFor="ep-start"><input id="ep-start" name="startDate" type="date" required className={inputClass} /></Field>
              <Field label="Fin de vigencia" htmlFor="ep-end"><input id="ep-end" name="endDate" type="date" required className={inputClass} /></Field>
            </ActionForm>
          </details>
        )}
      </section>
    </div>
  );
}
