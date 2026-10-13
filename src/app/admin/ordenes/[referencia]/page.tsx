import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ORDER_STATUS_LABELS } from "@/domain/admin";
import { formatCOP } from "@/domain/labels";
import { adminSession } from "@/server/admin";
import { db } from "@/server/db";
import { findOrderByReference } from "@/server/orders";
import { Badge, Card, inputClass } from "@/components/ui";
import { ActionForm } from "@/components/account/ActionForm";
import { STATUS_TONE } from "@/components/admin/AdminViews";
import { refundOrderAction, retryIssuanceAction } from "../../actions";

export const metadata: Metadata = { title: "Orden", robots: { index: false } };

const when = (iso: string) => iso.slice(0, 19).replace("T", " ");

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium text-ink">{v}</dd>
    </div>
  );
}

export default async function Page({ params }: PageProps<"/admin/ordenes/[referencia]">) {
  const session = await adminSession();
  if (!session) notFound();
  const { referencia } = await params;
  const order = findOrderByReference(decodeURIComponent(referencia));
  if (!order) notFound();
  const canEdit = session.role === "admin";
  const job = db().issuanceJobs.get(order.id);
  const policy = order.policyId ? db().policies.get(order.policyId) : undefined;
  const h = order.policyholder;
  const v = order.quote.vehicle;
  const canRetry = !order.policyId && (order.status === "aprobada" || (order.status === "error" && job?.status === "fallida"));
  const canRefund = !order.refund && ((!order.policyId && (order.status === "aprobada" || order.status === "error")) || order.status === "retractada");

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <Link href="/admin#ordenes" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted hover:text-heading">
        <ArrowLeft className="size-4" aria-hidden /> Volver al panel
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-xl font-extrabold text-heading">{order.reference}</h1>
        <Badge tone={STATUS_TONE[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-2 font-bold text-heading">Compra</h2>
          <dl className="divide-y divide-line text-sm">
            <Row k="Fecha" v={when(order.createdAt)} />
            <Row k="Plan" v={`${order.offer.planName} · ${order.offer.insurerName}`} />
            <Row k="Vehículo" v={`${v.brand} ${v.model} ${v.year}${v.plate ? ` · ${v.plate}` : ""}${v.engineCc ? ` · ${v.engineCc} cc` : ""}`} />
            <Row k="Valor asegurado" v={formatCOP(v.commercialValue)} />
            <Row k="Forma de pago" v={order.paymentPlan} />
            {order.offer.listPremium && <Row k="Precio de lista" v={formatCOP(order.offer.listPremium)} />}
            {order.offer.discounts?.map((d) => <Row key={d.ruleId} k={d.label} v={`−${formatCOP(d.amount)}`} />)}
            <Row k="Cobrado" v={formatCOP(order.amountInCents / 100)} />
            <Row k="Pasarela" v={`${order.provider}${order.providerTransactionId ? ` · ${order.providerTransactionId}` : ""}`} />
            {policy && (
              <Row k="Póliza" v={<Link className="text-brand underline" href={`/poliza/${policy.id}?t=${policy.accessToken}`}>{policy.number}</Link>} />
            )}
          </dl>
        </Card>
        <Card className="p-5">
          <h2 className="mb-2 font-bold text-heading">Tomador</h2>
          <dl className="divide-y divide-line text-sm">
            <Row k="Nombre" v={`${h.firstName} ${h.lastName}`} />
            <Row k="Documento" v={`${h.documentType} ${h.documentNumber}`} />
            <Row k="Correo" v={h.email} />
            <Row k="Celular" v={h.phone} />
            {Object.entries(order.kyc).map(([k, val]) => <Row key={k} k={`SARLAFT · ${k}`} v={typeof val === "boolean" ? (val ? "Sí" : "No") : val} />)}
          </dl>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-bold text-heading">Historial de estados</h2>
        <ol className="space-y-2 border-l-2 border-line pl-4 text-sm">
          {(order.history ?? [{ status: order.status, at: order.createdAt }]).map((s, i) => (
            <li key={i}>
              <Badge tone={STATUS_TONE[s.status]}>{ORDER_STATUS_LABELS[s.status]}</Badge>{" "}
              <span className="text-muted">{when(s.at)}</span>
              {"note" in s && s.note && <span className="text-ink"> · {s.note}</span>}
            </li>
          ))}
        </ol>
        {job && (
          <p className="mt-4 rounded-xl bg-canvas p-3 text-sm">
            Emisión: <strong>{job.status}</strong> · {job.attempts} intentos
            {job.status === "pendiente" && ` · siguiente ${when(new Date(job.nextAttemptAt).toISOString())}`}
            {job.lastError && <span className="block text-coral-ink">Último error: {job.lastError}</span>}
          </p>
        )}
        {order.refund && (
          <p className="mt-3 rounded-xl bg-canvas p-3 text-sm">
            Reembolso de <strong>{formatCOP(order.refund.amount)}</strong> registrado el {when(order.refund.at)} por {order.refund.by}: {order.refund.reason}
          </p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-2 font-bold text-heading">Evidencia de autorizaciones</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="text-left text-muted">
              <tr>{["Finalidad", "Otorgada", "Versión", "Fecha", "Origen", "IP"].map((c) => <th key={c} scope="col" className="py-1.5 font-medium">{c}</th>)}</tr>
            </thead>
            <tbody>
              {order.consentEvidence.map((c, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-1.5">{c.purpose}</td>
                  <td className="py-1.5">{c.granted ? "Sí" : "No"}</td>
                  <td className="py-1.5">{c.version}</td>
                  <td className="py-1.5">{when(c.at)}</td>
                  <td className="py-1.5">{c.source}</td>
                  <td className="py-1.5">{c.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {order.acceptance?.acceptedAt && (
          <p className="mt-3 text-sm text-muted">Aceptación con código el {when(order.acceptance.acceptedAt)} · IP {order.acceptance.ip ?? "—"}</p>
        )}
      </Card>

      {canEdit && (canRetry || canRefund) && (
        <Card className="space-y-4 p-5">
          <h2 className="font-bold text-heading">Acciones</h2>
          {canRetry && (
            <ActionForm action={retryIssuanceAction.bind(null, order.id)} submitLabel="Reintentar emisión" successMessage="Listo: se intentó emitir de nuevo." className="space-y-2">
              <p className="text-sm text-muted">Vuelve a pedir la póliza a la aseguradora con la misma clave de idempotencia (no genera un cobro nuevo).</p>
            </ActionForm>
          )}
          {canRefund && (
            <ActionForm action={refundOrderAction.bind(null, order.id)} submitLabel="Registrar reembolso" successMessage="Reembolso registrado y cliente notificado." className="space-y-2">
              <label htmlFor="refund-reason" className="block text-sm text-muted">
                Registra la devolución de {formatCOP(order.amountInCents / 100)} hecha en la pasarela. Se le avisa al cliente.
              </label>
              <textarea id="refund-reason" name="reason" required rows={2} placeholder="Motivo (p. ej. la aseguradora no pudo emitir)" className={`${inputClass} py-2`} />
            </ActionForm>
          )}
        </Card>
      )}
    </div>
  );
}
