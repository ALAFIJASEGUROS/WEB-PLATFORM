"use client";

import { useState, type FormEvent } from "react";
import { Mail, Phone } from "lucide-react";
import { CONSENTS } from "@/domain/consents";
import { formatCOP } from "@/domain/labels";
import { TIME_SLOTS, type TimeSlot } from "@/domain/leads";
import type { QuoteRequest, QuoteResponse } from "@/domain/types";
import { requestCall, saveQuoteByEmail } from "@/lib/api-client";
import { track } from "@/lib/analytics";
import { BottomSheet } from "@/components/BottomSheet";
import { Button, Field, inputClass } from "@/components/ui";

/** Para quien no compra ahora: que lo llamen o guardar la cotización. */
export function ContactOptions({ request, response }: { request: QuoteRequest; response: QuoteResponse }) {
  const [open, setOpen] = useState<"llamada" | "guardar" | null>(null);
  const best = response.offers[0];
  const v = request.vehicle;
  return (
    <section aria-labelledby="contacto" className="mt-8 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
      <h2 id="contacto" className="font-bold text-heading">¿No es el momento o tienes dudas?</h2>
      <p className="mt-1 text-sm text-muted">Un asesor te llama sin costo, o te enviamos esta cotización para que la retomes después.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" onClick={() => setOpen("llamada")}><Phone className="size-4" aria-hidden /> Que me llamen</Button>
        <Button variant="secondary" onClick={() => setOpen("guardar")}><Mail className="size-4" aria-hidden /> Envíamela al correo</Button>
      </div>
      <BottomSheet open={open === "llamada"} onClose={() => setOpen(null)} title="Te llamamos">
        <CallForm
          onDone={() => setOpen(null)}
          quote={{
            vehicleType: v.type,
            vehicle: `${v.brand} ${v.model} ${v.year}`,
            city: request.driver.city,
            offers: response.offers.length,
            ...(best && { best: { insurerName: best.insurerName, planName: best.planName, annualPremium: best.annualPremium } }),
          }}
        />
      </BottomSheet>
      <BottomSheet open={open === "guardar"} onClose={() => setOpen(null)} title="Guarda tu cotización">
        <SaveForm request={request} best={best && `${best.planName} de ${best.insurerName} por ${formatCOP(best.annualPremium)}`} />
      </BottomSheet>
    </section>
  );
}

function CallForm({ quote, onDone }: { quote: Parameters<typeof requestCall>[0]["quote"]; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await requestCall({
        kind: "llamada",
        name: String(f.get("name") ?? ""),
        phone: String(f.get("phone") ?? ""),
        email: String(f.get("email") ?? ""),
        slot: f.get("slot") as TimeSlot,
        contactConsent: f.get("consent") === "on",
        quote,
      });
      track("llamada_solicitada", { franja: String(f.get("slot")) });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos enviar tu solicitud.");
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <div role="status" className="space-y-3">
        <p className="text-ink">Listo. Un asesor te llamará en el horario que elegiste, con tu cotización a la mano.</p>
        <Button className="w-full" onClick={onDone}>Volver a mis opciones</Button>
      </div>
    );
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Nombre" htmlFor="call-name"><input id="call-name" name="name" required autoComplete="name" className={inputClass} /></Field>
      <Field label="Celular" htmlFor="call-phone" hint="10 dígitos, por ejemplo 300 123 4567"><input id="call-phone" name="phone" required inputMode="tel" autoComplete="tel" className={inputClass} /></Field>
      <Field label="Correo (opcional)" htmlFor="call-email" hint="Para confirmarte la solicitud."><input id="call-email" name="email" type="email" autoComplete="email" className={inputClass} /></Field>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold text-heading">¿Cuándo te llamamos?</legend>
        {(Object.entries(TIME_SLOTS) as [TimeSlot, string][]).map(([k, label], i) => (
          <label key={k} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-2 border-line px-3 text-sm text-ink has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
            <input type="radio" name="slot" value={k} defaultChecked={i === 1} className="size-4 accent-[var(--color-brand)]" />
            {label}
          </label>
        ))}
        <p className="text-xs text-muted">Solo llamamos en estos horarios (Ley 2300 de 2023).</p>
      </fieldset>
      <label className="flex gap-3 text-sm text-ink">
        <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-[var(--color-brand)]" />
        {CONSENTS.contact.text}
      </label>
      {error && <p role="alert" className="text-sm font-medium text-coral-ink">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Enviando…" : "Pedir la llamada"}</Button>
    </form>
  );
}

function SaveForm({ request, best }: { request: QuoteRequest; best?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ link?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      setDone(await saveQuoteByEmail({ email: String(f.get("email") ?? ""), consent: f.get("consent") === "on", request, best }));
      track("cotizacion_guardada");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar tu cotización.");
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div role="status" className="space-y-3 text-ink">
        {done.link ? (
          <>
            <p>En la demo no enviamos correos. Este es el enlace que te llegaría:</p>
            <input readOnly value={done.link} aria-label="Enlace de tu cotización" className={`${inputClass} text-sm`} onFocus={(e) => e.currentTarget.select()} />
          </>
        ) : (
          <p>Te la enviamos. Si mañana no has comprado, te enviaremos un solo recordatorio.</p>
        )}
      </div>
    );
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Correo" htmlFor="save-email"><input id="save-email" name="email" type="email" required autoComplete="email" className={inputClass} /></Field>
      <label className="flex gap-3 text-sm text-ink">
        <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-[var(--color-brand)]" />
        {CONSENTS.savedQuote.text}
      </label>
      {error && <p role="alert" className="text-sm font-medium text-coral-ink">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Enviando…" : "Enviar mi cotización"}</Button>
    </form>
  );
}
