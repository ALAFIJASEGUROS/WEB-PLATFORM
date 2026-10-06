import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";
import { COVERAGE_KEYS } from "@/domain/types";
import { COVERAGE_LABELS, formatCOP, formatMillions, SERVICE_LABELS } from "@/domain/labels";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { canRetract, getPolicyForViewer, retractDeadline } from "@/server/orders";
import { ActionForm } from "@/components/account/ActionForm";
import { retractAction } from "../actions";

export const metadata = { title: "Póliza", robots: { index: false } };

export default async function Page({ params, searchParams }: PageProps<"/poliza/[id]">) {
  const { id } = await params;
  const { t } = await searchParams;
  const user = await getCurrentUser();
  const policy = getPolicyForViewer(id, typeof t === "string" ? t : undefined, user?.id);
  if (!policy) notFound();
  const order = policy.orderId ? db().orders.get(policy.orderId) : undefined;
  const offer = order?.offer;
  const v = policy.vehicle;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 print:py-0">
      <Link href={user ? "/cuenta/seguros" : "/"} className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted hover:text-heading print:hidden">
        <ArrowLeft className="size-4" aria-hidden /> {user ? "Mis seguros" : "Inicio"}
      </Link>
      <Card className="space-y-6 p-6 print:shadow-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-mint">
              <ShieldCheck className="size-4" aria-hidden /> {policy.status === "retractada" ? "Póliza anulada" : "Póliza vigente"}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-heading">{policy.planName}</h1>
            <p className="text-muted">{policy.insurerName}</p>
          </div>
          <PrintButton />
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">Número de póliza</dt><dd className="font-bold">{policy.number}</dd></div>
          <div><dt className="text-muted">Vigencia</dt><dd className="font-bold">{policy.startDate} a {policy.endDate}</dd></div>
          <div><dt className="text-muted">Tomador y asegurado</dt><dd className="font-bold">{policy.holderName}</dd></div>
          {order && <div><dt className="text-muted">Documento</dt><dd className="font-bold">{order.policyholder.documentType} {order.policyholder.documentNumber}</dd></div>}
          <div><dt className="text-muted">Vehículo</dt><dd className="font-bold">{v.brand} {v.model} {v.year}</dd></div>
          <div><dt className="text-muted">Placa</dt><dd className="font-bold">{v.plate ?? "Por asignar"}</dd></div>
          <div><dt className="text-muted">Valor asegurado</dt><dd className="font-bold">{formatCOP(v.commercialValue)}</dd></div>
          {policy.annualPremium && <div><dt className="text-muted">Prima anual</dt><dd className="font-bold">{formatCOP(policy.annualPremium)}</dd></div>}
        </dl>

        {offer && (
          <div className="grid gap-6 border-t border-line pt-6 sm:grid-cols-2">
            <div>
              <h2 className="mb-2 font-bold text-heading">Coberturas</h2>
              <ul className="space-y-1 text-sm">
                {COVERAGE_KEYS.filter((k) => offer.coverages[k]).map((k) => (
                  <li key={k}>• {COVERAGE_LABELS[k]}{k === "rc" && ` (${formatMillions(offer.rcLimit)})`}</li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-muted">
                Deducible: {offer.deductiblePct ? `${offer.deductiblePct}% mín. ${offer.deductibleMinSmmlv} SMMLV` : "sin deducible"}
              </p>
            </div>
            <div>
              <h2 className="mb-2 font-bold text-heading">Asistencias</h2>
              <ul className="space-y-1 text-sm">
                {offer.services.map((s) => <li key={s}>• {SERVICE_LABELS[s]}</li>)}
              </ul>
            </div>
          </div>
        )}

        {policy.status === "retractada" && (
          <p role="status" className="rounded-xl bg-coral-soft p-4 text-sm font-medium text-coral">
            Ejerciste el derecho de retracto el {policy.retractedAt?.slice(0, 10)}. Esta póliza no está vigente y te devolveremos el dinero por el mismo medio de pago.
          </p>
        )}

        {canRetract(policy) && (
          <details className="rounded-xl border border-line p-4 text-sm print:hidden">
            <summary className="cursor-pointer font-semibold text-heading">
              Derecho de retracto: puedes arrepentirte hasta el {retractDeadline(policy)}
            </summary>
            <p className="mt-2 text-muted">
              Si te retractas, anulamos la póliza y te devolvemos lo que pagaste por el mismo medio de pago. La póliza deja
              de cubrirte desde ese momento.
            </p>
            <ActionForm action={retractAction} submitLabel="Retractarme de esta compra" successMessage="Listo. Tu retracto quedó registrado." className="mt-3 space-y-3">
              <input type="hidden" name="policyId" value={policy.id} />
              <input type="hidden" name="token" value={typeof t === "string" ? t : ""} />
              <label className="flex gap-3">
                <input type="checkbox" name="confirm" className="mt-0.5 size-5 shrink-0 accent-[var(--color-brand)]" />
                <span>Confirmo que quiero retractarme y anular esta póliza.</span>
              </label>
            </ActionForm>
          </details>
        )}

        <div className="rounded-xl bg-brand-soft p-4 text-sm text-heading">
          <p className="font-bold">¿Tuviste un accidente?</p>
          <p>Llama a la línea de asistencia de {policy.insurerName} y ten a mano tu número de póliza. Revisa la guía en <Link className="font-semibold underline" href="/ayuda#siniestros">Ayuda</Link>.</p>
        </div>

        <p className="text-xs text-muted">
          Documento de demostración generado por SeguAlaFija. No constituye una póliza real
          ni es emitido por {policy.insurerName}.
        </p>
      </Card>
    </div>
  );
}
