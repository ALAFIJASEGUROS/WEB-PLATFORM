"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Info, ShieldCheck, XCircle } from "lucide-react";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Button, ButtonLink, Card, InsurerLogo } from "@/components/ui";
import { COVERAGE_KEYS } from "@/domain/types";
import { COVERAGE_LABELS, formatCOP, SERVICE_LABELS } from "@/domain/labels";
import { useHydrated } from "@/lib/quote-store";
import { findDemoOrder, readDemoOrders, settleDemoOrder } from "@/lib/demo-store";

// Páginas de la demo estática (GitHub Pages). Reemplazan a las que
// necesitan servidor: checkout, pago, póliza, cuenta y admin.

function useParam(name: string) {
  return useSearchParams().get(name) ?? "";
}

function withSuspense(C: () => React.ReactNode) {
  return function Page() {
    return (
      <Suspense fallback={<div className="min-h-[60vh]" aria-busy />}>
        <C />
      </Suspense>
    );
  };
}

function StaticNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 rounded-xl bg-sun-soft p-3 text-sm text-sun-ink">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export const CheckoutPage = withSuspense(function Checkout() {
  return <CheckoutForm offerId={useParam("oferta")} simulatedPayments />;
});

export const GatewayPage = withSuspense(function Gateway() {
  const router = useRouter();
  const ref = useParam("ref");
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const order = hydrated ? findDemoOrder(ref) : null;
  if (!hydrated) return null;
  if (!order) return <NotFoundCard />;
  const pay = (ok: boolean) => {
    setBusy(true);
    settleDemoOrder(ref, ok);
    router.push(`/pago/resultado?ref=${ref}`);
  };
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Card className="space-y-5 p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Pasarela simulada</p>
          <h1 className="mt-1 text-2xl font-extrabold text-heading">{formatCOP(order.amount)}</h1>
          <p className="text-sm text-muted">{order.offer.planName} · {order.offer.insurerName}</p>
        </div>
        <StaticNotice>En la versión completa aquí se abre el checkout de Wompi (PSE, tarjeta, Nequi).</StaticNotice>
        <div className="grid gap-2">
          <Button disabled={busy} onClick={() => pay(true)}>Simular pago aprobado</Button>
          <Button disabled={busy} variant="ghost" onClick={() => pay(false)}>Simular pago rechazado</Button>
        </div>
      </Card>
    </div>
  );
});

export const ResultPage = withSuspense(function Result() {
  const ref = useParam("ref");
  const hydrated = useHydrated();
  if (!hydrated) return null;
  const order = findDemoOrder(ref);
  if (!order) return <NotFoundCard />;
  if (order.status !== "emitida" || !order.policy) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <XCircle className="mx-auto size-16 text-coral" aria-hidden />
        <h1 className="mt-4 text-2xl font-extrabold text-heading">Tu pago no fue aprobado</h1>
        <p className="mt-2 text-muted">No se hizo ningún cobro. Puedes intentarlo de nuevo.</p>
        <ButtonLink href={`/checkout?oferta=${encodeURIComponent(order.offer.id)}`} className="mt-6">Intentar de nuevo</ButtonLink>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center">
      <CheckCircle2 className="mx-auto size-16 text-mint" aria-hidden />
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-heading">¡Listo, ya estás asegurado!</h1>
      <p className="mt-2 text-muted">Pagaste {formatCOP(order.amount)}. En la versión completa te enviamos la póliza a <strong>{order.input.policyholder.email}</strong>.</p>
      <div className="mt-6 grid gap-3">
        <ButtonLink href={`/poliza?id=${order.policy.id}`}>Ver mi póliza</ButtonLink>
        <ButtonLink href="/cuenta" variant="secondary">Ver mis seguros</ButtonLink>
      </div>
    </div>
  );
});

export const PolicyPage = withSuspense(function Policy() {
  const id = useParam("id");
  const hydrated = useHydrated();
  if (!hydrated) return null;
  const order = readDemoOrders().find((o) => o.policy?.id === id);
  if (!order?.policy) return <NotFoundCard />;
  const { offer, policy } = { offer: order.offer, policy: order.policy };
  const h = order.input.policyholder;
  const v = order.input.quote.vehicle;
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/cuenta" className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-heading">← Mis seguros</Link>
      <Card className="space-y-6 p-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-mint"><ShieldCheck className="size-4" aria-hidden /> Póliza vigente</p>
          <h1 className="mt-1 text-2xl font-extrabold text-heading">{offer.planName}</h1>
          <p className="text-muted">{offer.insurerName}</p>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">Número de póliza</dt><dd className="font-bold">{policy.number}</dd></div>
          <div><dt className="text-muted">Vigencia</dt><dd className="font-bold">{policy.startDate} a {policy.endDate}</dd></div>
          <div><dt className="text-muted">Tomador</dt><dd className="font-bold">{h.firstName} {h.lastName}</dd></div>
          <div><dt className="text-muted">Vehículo</dt><dd className="font-bold">{v.brand} {v.model} {v.year} {v.plate ?? ""}</dd></div>
        </dl>
        <div className="grid gap-6 border-t border-line pt-6 sm:grid-cols-2">
          <ul className="space-y-1 text-sm">{COVERAGE_KEYS.filter((k) => offer.coverages[k]).map((k) => <li key={k}>• {COVERAGE_LABELS[k]}</li>)}</ul>
          <ul className="space-y-1 text-sm">{offer.services.map((s) => <li key={s}>• {SERVICE_LABELS[s]}</li>)}</ul>
        </div>
        <Link href={`/siniestros#${offer.insurerId}`} className="flex min-h-11 items-center gap-2 rounded-2xl bg-coral-soft px-4 py-3 text-sm font-semibold text-coral-ink hover:underline">
          <AlertTriangle className="size-4 shrink-0" aria-hidden /> ¿Tuviste un choque o un hurto? Mira qué hacer
        </Link>
        <p className="text-xs text-muted">Documento de demostración. No constituye una póliza real.</p>
      </Card>
    </div>
  );
});

export function AccountPage() {
  const hydrated = useHydrated();
  const orders = hydrated ? readDemoOrders().filter((o) => o.policy) : [];
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-heading">Mis seguros</h1>
      <StaticNotice>
        Esta es la versión estática del prototipo. En la versión completa la cuenta tiene acceso con código
        por correo, vehículos con SOAT y tecnomecánica, recordatorios, ofertas de aseguradoras y perfil.
        Aquí solo ves las pólizas compradas desde este navegador.
      </StaticNotice>
      {hydrated && orders.length === 0 && (
        <Card className="flex flex-col items-start gap-3 p-5">
          <p className="font-bold text-heading">Aún no has comprado desde este navegador</p>
          <ButtonLink href="/cotizar">Cotizar</ButtonLink>
        </Card>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {orders.map((o) => (
          <Card key={o.reference} className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <InsurerLogo id={o.offer.insurerId} name={o.offer.insurerName} />
              <div className="flex-1">
                <p className="font-bold text-heading">{o.offer.planName}</p>
                <p className="text-sm text-muted">{o.offer.insurerName} · {o.input.quote.vehicle.plate ?? o.input.quote.vehicle.model}</p>
              </div>
            </div>
            <p className="text-sm text-muted">Nº {o.policy!.number} · hasta {o.policy!.endDate}</p>
            <Link href={`/poliza?id=${o.policy!.id}`} className="text-sm font-semibold text-brand underline">Ver póliza</Link>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AdminPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <StaticNotice>El panel de administración necesita servidor y no está disponible en la versión estática.</StaticNotice>
    </div>
  );
}

function NotFoundCard() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-extrabold text-heading">No encontramos esta compra</h1>
      <p className="mt-2 text-muted">En la demo estática las compras se guardan solo en este navegador.</p>
      <ButtonLink href="/cotizar" className="mt-6">Cotizar</ButtonLink>
    </div>
  );
}
