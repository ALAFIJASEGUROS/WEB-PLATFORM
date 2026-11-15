import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";
import { CheckCircle2, Clock, Mail, ShieldCheck, XCircle } from "lucide-react";
import { ButtonLink, Card } from "@/components/ui";
import { formatCOP, vehicleName } from "@/domain/labels";
import { getCurrentUser } from "@/server/auth";
import { applyPaymentUpdate, getOrderForViewer, processIssuance } from "@/server/orders";
import { paymentProvider, providerById } from "@/server/payments";
import { AutoRefresh } from "./AutoRefresh";

export const metadata = { title: "Estado del pago", robots: { index: false } };

export default async function Page({ searchParams }: PageProps<"/pago/resultado">) {
  const { ref, t, id } = await searchParams;
  if (typeof ref !== "string") notFound();
  const user = await getCurrentUser();

  // Regreso desde Wompi tras pagar una cuota.
  const installment = db().installmentPayments.get(ref);
  if (installment) {
    const provider = installment.provider ? providerById(installment.provider) : paymentProvider();
    if (typeof id === "string" && provider?.fetchTransaction) {
      const update = await provider.fetchTransaction(id);
      if (update?.reference === ref) await applyPaymentUpdate(update);
    }
    const paid = db().policies.get(installment.policyId)?.installments?.find((i) => i.n === installment.n)?.status === "pagada";
    if (paid) redirect(`/cuenta/seguros?cuota=${installment.n}`);
    if (installment.status === "fallida") {
      redirect(`/cuenta/seguros?error=${encodeURIComponent("El pago de la cuota no fue aprobado. No se hizo ningún cobro.")}`);
    }
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <AutoRefresh />
        <Clock className="mx-auto size-16 text-brand" aria-hidden />
        <h1 className="mt-4 text-2xl font-extrabold text-heading">Estamos confirmando el pago de tu cuota</h1>
        <p className="mt-2 text-muted">Algunos pagos por PSE tardan unos minutos. Esta página se actualiza sola.</p>
      </div>
    );
  }

  let order = getOrderForViewer(ref, typeof t === "string" ? t : undefined, user?.id);
  if (!order) notFound();

  // Al volver de Wompi llega ?id=<transacción>. Consultamos su estado por si el
  // webhook aún no ha llegado (la actualización es idempotente).
  const provider = providerById(order.provider);
  if (order.status === "pendiente" && typeof id === "string" && provider?.fetchTransaction) {
    const update = await provider.fetchTransaction(id);
    if (update && update.reference === order.reference) {
      order = (await applyPaymentUpdate(update)) ?? order;
    }
  }

  // Pago aprobado con la emisión pendiente: si ya le toca, se reintenta aquí.
  if (order.status === "aprobada") await processIssuance(order.id);

  const amount = formatCOP(order.amountInCents / 100);
  // Beneficio de empresa: quién pagó y cómo.
  const paidText =
    order.company?.channel === "empresa"
      ? "Tu empresa paga este seguro."
      : order.company?.channel === "nomina"
        ? `Tu parte (${formatCOP(order.company.employeePart)}) se descontará de tu nómina en 12 cuotas.`
        : `Pagaste ${amount}.`;

  if (order.status === "emitida" && order.policyId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center">
        <CheckCircle2 className="mx-auto size-16 text-mint" aria-hidden />
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-heading">¡Listo, ya estás asegurado!</h1>
        <p className="mt-2 text-muted">
          {paidText} Enviamos la póliza a <strong>{order.policyholder.email}</strong>.
        </p>
        <Card className="mt-6 space-y-1 p-5 text-left text-sm">
          <p><span className="text-muted">Plan:</span> <strong>{order.offer.planName}</strong> · {order.offer.insurerName}</p>
          <p><span className="text-muted">Vehículo:</span> {vehicleName(order.quote.vehicle.brand, order.quote.vehicle.model)} {order.quote.vehicle.plate ?? ""}</p>
          <p><span className="text-muted">Referencia de pago:</span> {order.reference}</p>
        </Card>
        <div className="mt-6 grid gap-3">
          <ButtonLink href={`/poliza/${order.policyId}?t=${order.accessToken}`}>Ver mi póliza</ButtonLink>
          {!user && (
            <ButtonLink href={`/cuenta?email=${encodeURIComponent(order.policyholder.email)}`} variant="secondary">
              Guardarla en mi cuenta y activar recordatorios
            </ButtonLink>
          )}
        </div>
      </div>
    );
  }

  if (order.status === "aprobada") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <AutoRefresh />
        <Clock className="mx-auto size-16 text-brand" aria-hidden />
        <h1 className="mt-4 text-2xl font-extrabold text-heading">Pago aprobado. Estamos emitiendo tu póliza</h1>
        <p className="mt-2 text-muted">
          {order.company && order.company.channel !== "wompi" ? "Confirmamos tu compra." : `Recibimos ${amount}.`} {order.offer.insurerName} está tardando más de lo normal en emitir tu póliza.
          Lo seguimos intentando de forma automática.
        </p>
        <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left text-sm">
          <li className="flex gap-2"><Clock className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />Normalmente queda lista en menos de 30 minutos.</li>
          <li className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />Te enviaremos la póliza a {order.policyholder.email}. Puedes cerrar esta página.</li>
          <li className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />No vuelvas a pagar: si no se puede emitir, te devolvemos el dinero completo.</li>
        </ul>
      </div>
    );
  }

  if (order.status === "pendiente") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <AutoRefresh />
        <Clock className="mx-auto size-16 text-brand" aria-hidden />
        <h1 className="mt-4 text-2xl font-extrabold text-heading">Estamos confirmando tu pago</h1>
        <p className="mt-2 text-muted">
          Algunos pagos por PSE tardan unos minutos. Esta página se actualiza sola y también te
          avisaremos por correo.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <XCircle className="mx-auto size-16 text-coral" aria-hidden />
      <h1 className="mt-4 text-2xl font-extrabold text-heading">
        {order.status === "error" ? "Hubo un problema emitiendo tu póliza" : "Tu pago no fue aprobado"}
      </h1>
      <p className="mt-2 text-muted">
        {order.status === "error"
          ? "Nuestro equipo ya fue notificado y te contactará. No vuelvas a pagar."
          : "No se hizo ningún cobro. Puedes intentarlo de nuevo con otro medio de pago."}
      </p>
      {order.status !== "error" && (
        <ButtonLink href={`/checkout?oferta=${encodeURIComponent(order.offer.id)}`} className="mt-6">
          Intentar de nuevo
        </ButtonLink>
      )}
      <p className="mt-6 text-sm">
        <Link href="/ayuda" className="font-semibold text-brand underline">¿Necesitas ayuda?</Link>
      </p>
    </div>
  );
}
