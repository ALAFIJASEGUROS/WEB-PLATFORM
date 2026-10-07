"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changedPrice, startCheckout } from "@/lib/api-client";
import { kycFieldsFor, validateKyc } from "@/insurers/registry";
import { AcceptanceDialog } from "./AcceptanceDialog";
import { analyticsSessionId, discountProps, track } from "@/lib/analytics";
import Link from "next/link";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { policyholderSchema, type Policyholder } from "@/domain/schemas";
import { formatCOP } from "@/domain/labels";
import { useHydrated, useQuoteRequest, useQuoteResponse } from "@/lib/quote-store";
import { Button, ButtonLink, Card, Field, InsurerLogo, SimulatedDataNotice, inputClass } from "@/components/ui";

type Errors = Partial<Record<keyof Policyholder, string>>;

export function CheckoutForm({
  offerId,
  defaultEmail,
  simulatedPayments,
}: {
  offerId: string;
  defaultEmail?: string;
  simulatedPayments: boolean;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const request = useQuoteRequest();
  const response = useQuoteResponse();
  const offer = response?.offers.find((o) => o.id === offerId);

  const [plan, setPlan] = useState<"anual" | "mensual">("anual");
  const [holder, setHolder] = useState<Policyholder>({
    firstName: "",
    lastName: "",
    documentType: "CC",
    documentNumber: "",
    email: defaultEmail ?? "",
    phone: "",
    address: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [terms, setTerms] = useState(false);
  const [data, setData] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [acceptance, setAcceptance] = useState<{ reference: string; token: string; demoCode?: string } | null>(null);
  const [kyc, setKyc] = useState<Record<string, string | boolean>>({});
  const [kycErrors, setKycErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  /** Precio revalidado por el servidor cuando cambió desde la cotización. */
  const [repriced, setRepriced] = useState<{ plan: "anual" | "mensual"; amount: number } | null>(null);

  if (!hydrated) return <div className="min-h-[60vh]" aria-busy />;

  if (!offer || !request) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-heading">Esta oferta ya no está disponible</h1>
        <p className="mt-2 text-muted">Vuelve a cotizar para ver precios actualizados.</p>
        <ButtonLink href="/cotizar" className="mt-6">Cotizar</ButtonLink>
      </div>
    );
  }

  const set = (k: keyof Policyholder, v: string) => {
    setHolder((h) => ({ ...h, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function goToPayment(redirectUrl: string) {
    if (redirectUrl.startsWith("/")) router.push(redirectUrl);
    else window.location.assign(redirectUrl);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const parsed = policyholderSchema.safeParse(holder);
    if (!parsed.success) {
      const errs: Errors = {};
      for (const i of parsed.error.issues) {
        const k = i.path[0] as keyof Policyholder;
        errs[k] ??= i.message.startsWith("Too") ? "Revisa este campo" : i.message;
      }
      setErrors(errs);
      document.getElementById(Object.keys(errs)[0])?.focus();
      return;
    }
    const kycCheck = validateKyc(kycFieldsFor(offer!.insurerId), kyc);
    setKycErrors(kycCheck.errors);
    if (!kycCheck.ok) {
      document.getElementById(`kyc-${Object.keys(kycCheck.errors)[0]}`)?.focus();
      return;
    }
    if (!terms || !data) {
      setServerError("Debes aceptar los términos y la autorización de tratamiento de datos.");
      return;
    }
    setSubmitting(true);
    try {
      track("checkout_enviado", { plan, aseguradora: offer!.insurerId, ...discountProps(offer!) });
      const result = await startCheckout({
        analyticsSid: analyticsSessionId(),
        quote: request!,
        offerId,
        paymentPlan: plan,
        expectedAmount: amount,
        policyholder: parsed.data,
        consents: { terms, dataProcessing: data, marketing },
        kyc: kycCheck.clean,
      });
      if (result.acceptance) {
        setAcceptance(result);
        setSubmitting(false);
      } else {
        goToPayment(result.redirectUrl);
      }
    } catch (err) {
      const current = changedPrice(err);
      if (current !== undefined) setRepriced({ plan, amount: current });
      setServerError(err instanceof Error ? err.message : "No pudimos iniciar el pago.");
      setSubmitting(false);
    }
  }

  const quoted = plan === "anual" ? offer.annualPremium : offer.monthlyPremium;
  const amount = repriced?.plan === plan ? repriced.amount : quoted;
  const v = request.vehicle;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:pb-6">
      <Link href="/resultados" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted hover:text-heading">
        <ArrowLeft className="size-4" aria-hidden /> Volver a opciones
      </Link>
      <h1 className="text-2xl font-extrabold tracking-tight text-heading">Compra tu seguro</h1>
      <p className="mt-1 text-muted">No necesitas crear cuenta. Te enviamos la póliza a tu correo.</p>

      {acceptance && (
        <AcceptanceDialog
          email={holder.email}
          reference={acceptance.reference}
          token={acceptance.token}
          demoCode={acceptance.demoCode}
          onAccepted={goToPayment}
          onCancel={() => setAcceptance(null)}
        />
      )}
      <form onSubmit={submit} noValidate className="mt-6 grid gap-6 md:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="flex items-center gap-3 p-4 md:hidden">
            <InsurerLogo id={offer.insurerId} name={offer.insurerName} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-heading">{offer.planName}</p>
              <p className="truncate text-sm text-muted">{offer.insurerName} · {v.brand} {v.model} {v.plate ?? ""}</p>
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <h2 className="font-bold text-heading">Datos del tomador</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombres" htmlFor="firstName" error={errors.firstName}>
                <input id="firstName" className={inputClass} autoComplete="given-name" value={holder.firstName} aria-invalid={!!errors.firstName} onChange={(e) => set("firstName", e.target.value)} />
              </Field>
              <Field label="Apellidos" htmlFor="lastName" error={errors.lastName}>
                <input id="lastName" className={inputClass} autoComplete="family-name" value={holder.lastName} aria-invalid={!!errors.lastName} onChange={(e) => set("lastName", e.target.value)} />
              </Field>
              <Field label="Tipo de documento" htmlFor="documentType">
                <select id="documentType" className={inputClass} value={holder.documentType} onChange={(e) => set("documentType", e.target.value)}>
                  <option value="CC">Cédula de ciudadanía</option>
                  <option value="CE">Cédula de extranjería</option>
                  <option value="PA">Pasaporte</option>
                </select>
              </Field>
              <Field label="Número de documento" htmlFor="documentNumber" error={errors.documentNumber}>
                <input id="documentNumber" className={inputClass} inputMode={holder.documentType === "PA" ? "text" : "numeric"} value={holder.documentNumber} aria-invalid={!!errors.documentNumber} onChange={(e) => set("documentNumber", e.target.value.replace(/\s/g, ""))} />
              </Field>
              <Field label="Correo electrónico" htmlFor="email" error={errors.email} hint="Aquí te llega la póliza.">
                <input id="email" type="email" className={inputClass} autoComplete="email" value={holder.email} aria-invalid={!!errors.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
              <Field label="Celular" htmlFor="phone" error={errors.phone}>
                <input id="phone" type="tel" className={inputClass} inputMode="numeric" autoComplete="tel-national" placeholder="3001234567" maxLength={10} value={holder.phone} aria-invalid={!!errors.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Dirección" htmlFor="address" error={errors.address}>
                  <input id="address" className={inputClass} autoComplete="street-address" value={holder.address} aria-invalid={!!errors.address} onChange={(e) => set("address", e.target.value)} />
                </Field>
              </div>
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <fieldset>
              <legend className="mb-3 font-bold text-heading">¿Cómo quieres pagar?</legend>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {(["anual", "mensual"] as const).map((p) => (
                  <label key={p} className={`flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 p-4 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-brand ${plan === p ? "border-brand bg-brand-soft" : "border-line"}`}>
                    <input type="radio" name="plan" className="sr-only" checked={plan === p} onChange={() => setPlan(p)} />
                    <span>
                      <span className="block font-semibold text-heading">{p === "anual" ? "Pago único anual" : "Pago mensual"}</span>
                      <span className="block text-sm text-muted">
                        {p === "anual" ? formatCOP(offer.annualPremium) : `${formatCOP(offer.monthlyPremium)} x 12`}
                      </span>
                    </span>
                    {p === "anual" && <span className="rounded-full bg-mint-soft px-2 py-1 text-xs font-bold text-mint">Ahorras 6%</span>}
                  </label>
                ))}
              </div>
            </fieldset>
            {plan === "mensual" && (
              <p className="text-sm text-muted">Hoy pagas la primera cuota. Te recordamos cada mes antes del siguiente pago.</p>
            )}
          </Card>

          {kycFieldsFor(offer.insurerId).length > 0 && (
            <Card className="space-y-4 p-5" role="region" aria-labelledby="kyc-title">
              <div>
                <h2 id="kyc-title" className="font-bold text-heading">Conocimiento del cliente</h2>
                <p className="text-sm text-muted">
                  {offer.insurerName} pide estos datos por norma (SARLAFT) antes de emitir la póliza.
                </p>
              </div>
              {kycFieldsFor(offer.insurerId).map((f) =>
                f.type === "select" ? (
                  <Field key={f.key} label={f.label} htmlFor={`kyc-${f.key}`} hint={f.help} error={kycErrors[f.key]}>
                    <select
                      id={`kyc-${f.key}`}
                      className={inputClass}
                      value={String(kyc[f.key] ?? "")}
                      aria-invalid={!!kycErrors[f.key]}
                      onChange={(e) => setKyc((k) => ({ ...k, [f.key]: e.target.value }))}
                    >
                      <option value="">Selecciona</option>
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                ) : (
                  <fieldset key={f.key} className="space-y-2">
                    <legend className="text-sm font-semibold text-heading">{f.label}</legend>
                    {f.help && <p className="text-xs text-muted">{f.help}</p>}
                    <div className="flex gap-2">
                      {[{ v: true, l: "Sí" }, { v: false, l: "No" }].map(({ v, l }) => (
                        <label key={l} className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-2xl border-2 text-sm font-semibold has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-brand ${kyc[f.key] === v ? "border-brand bg-brand-soft text-heading" : "border-line text-heading"}`}>
                          <input id={v ? `kyc-${f.key}` : undefined} type="radio" name={`kyc-${f.key}`} className="sr-only" checked={kyc[f.key] === v} onChange={() => setKyc((k) => ({ ...k, [f.key]: v }))} />
                          {l}
                        </label>
                      ))}
                    </div>
                    {kycErrors[f.key] && <p role="alert" className="text-xs font-medium text-coral">{kycErrors[f.key]}</p>}
                  </fieldset>
                ),
              )}
            </Card>
          )}

          <Card className="space-y-3 p-5">
            <h2 className="font-bold text-heading">Autorizaciones</h2>
            <label className="flex gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-brand" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              <span>Leí y acepto los <Link href="/legal/terminos" target="_blank" className="font-semibold text-brand underline">términos y condiciones</Link> y el condicionado del seguro. Conozco mi <Link href="/legal/retracto" target="_blank" className="font-semibold text-brand underline">derecho de retracto</Link>.</span>
            </label>
            <label className="flex gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-brand" checked={data} onChange={(e) => setData(e.target.checked)} />
              <span>Autorizo el tratamiento de mis datos personales para cotizar, emitir y administrar mi seguro, y su transferencia a la aseguradora elegida, según la <Link href="/legal/privacidad" target="_blank" className="font-semibold text-brand underline">política de datos</Link>.</span>
            </label>
            <label className="flex gap-3 text-sm text-muted">
              <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-brand" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
              <span>(Opcional) Quiero recibir ofertas e información de aseguradoras y aliados. Puedo retirarlo cuando quiera.</span>
            </label>
          </Card>
        </div>

        <aside className="md:sticky md:top-20 md:self-start">
          <Card className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <InsurerLogo id={offer.insurerId} name={offer.insurerName} />
              <div>
                <p className="font-bold text-heading">{offer.planName}</p>
                <p className="text-sm text-muted">{offer.insurerName}</p>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-muted">Vehículo</dt><dd className="text-right font-semibold">{v.brand} {v.model} {v.year}</dd></div>
              {v.plate && <div className="flex justify-between"><dt className="text-muted">Placa</dt><dd className="font-semibold">{v.plate}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Vigencia</dt><dd className="font-semibold">12 meses</dd></div>
              {plan === "anual" && (
                <>
                  {offer.listPremium && (
                    <div className="flex justify-between"><dt className="text-muted">Precio de lista</dt><dd className="font-semibold"><s>{formatCOP(offer.listPremium)}</s></dd></div>
                  )}
                  {offer.discounts?.map((d) => (
                    <div key={d.ruleId} className="flex justify-between text-mint"><dt>{d.label}</dt><dd className="font-semibold">−{formatCOP(d.amount)}</dd></div>
                  ))}
                  <div className="flex justify-between"><dt className="text-muted">Prima sin IVA</dt><dd className="font-semibold">{formatCOP(offer.netPremium)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">IVA (19%)</dt><dd className="font-semibold">{formatCOP(offer.iva)}</dd></div>
                </>
              )}
              <div className="flex justify-between"><dt className="text-muted">Deducible</dt><dd className="font-semibold">{offer.deductiblePct ? `${offer.deductiblePct}%` : "Sin deducible"}</dd></div>
            </dl>
            <div className="border-t border-line pt-4">
              <p className="text-sm text-muted">Pagas hoy</p>
              <p className="text-3xl font-extrabold tracking-tight text-heading">{formatCOP(amount)}</p>
            </div>
            {serverError && <p role="alert" className="rounded-xl bg-coral-soft p-3 text-sm text-coral">{serverError}</p>}
            <Button type="submit" className="hidden w-full md:inline-flex" disabled={submitting}>
              <Lock className="size-4" aria-hidden />
              {submitting ? "Redirigiendo…" : "Pagar con Wompi"}
            </Button>
            <p className="flex items-center gap-2 text-xs text-muted">
              <ShieldCheck className="size-4 text-mint" aria-hidden />
              PSE, tarjeta, Nequi o botón Bancolombia. No guardamos los datos de tu tarjeta.
            </p>
            {simulatedPayments && (
              <p className="text-xs text-sun-ink">Modo demo: el pago es simulado.</p>
            )}
            <SimulatedDataNotice />
          </Card>
        </aside>

        <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-4 pt-3 shadow-[0_-4px_16px_rgb(16_33_63/0.06)] md:hidden">
          {serverError && <p role="alert" className="mb-2 rounded-xl bg-coral-soft p-2 text-xs text-coral">{serverError}</p>}
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted">{plan === "anual" ? "Pago anual" : "Primera cuota"}</p>
              <p className="text-lg font-extrabold leading-tight text-heading">{formatCOP(amount)}</p>
            </div>
            <Button type="submit" className="flex-1" disabled={submitting}>
              <Lock className="size-4" aria-hidden />
              {submitting ? "Redirigiendo…" : "Pagar"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
