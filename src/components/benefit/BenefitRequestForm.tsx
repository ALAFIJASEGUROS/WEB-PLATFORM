"use client";

import { useState, type FormEvent } from "react";
import { Building2 } from "lucide-react";
import { CONSENTS } from "@/domain/consents";
import { TIME_SLOTS, type TimeSlot } from "@/domain/leads";
import { requestCall } from "@/lib/api-client";
import { track } from "@/lib/analytics";
import { Button, Field, inputClass } from "@/components/ui";

/** "Quiero el beneficio para mi empresa": llega a la bandeja de oportunidades del admin. */
export function BenefitRequestForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const employees = Number(f.get("employees"));
    setBusy(true);
    setError(null);
    try {
      await requestCall({
        kind: "empresa",
        name: String(f.get("name") ?? ""),
        phone: String(f.get("phone") ?? ""),
        email: String(f.get("email") ?? ""),
        slot: f.get("slot") as TimeSlot,
        contactConsent: f.get("consent") === "on",
        benefit: {
          company: String(f.get("company") ?? ""),
          nit: String(f.get("nit") ?? "") || undefined,
          employees: Number.isFinite(employees) && employees > 0 ? Math.round(employees) : 0,
          role: String(f.get("role") ?? "") || undefined,
        },
      });
      track("llamada_solicitada", { tipo: "empresa", empleados: employees || 0 });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos enviar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <p role="status" className="rounded-[var(--radius-card)] bg-mint-soft p-5 text-ink">
        Recibimos tu solicitud. Un asesor te contactará en el horario que elegiste para armar el programa de tu empresa.
      </p>
    );

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)] md:p-6">
      <h2 id="solicitud-titulo" className="flex items-center gap-2 text-lg font-bold text-heading">
        <Building2 className="size-5 text-brand" aria-hidden /> Quiero el beneficio para mi empresa
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Empresa" htmlFor="be-company"><input id="be-company" name="company" required autoComplete="organization" className={inputClass} /></Field>
        <Field label="NIT (opcional)" htmlFor="be-nit"><input id="be-nit" name="nit" inputMode="numeric" className={inputClass} /></Field>
        <Field label="Número de empleados" htmlFor="be-employees"><input id="be-employees" name="employees" type="number" min={1} required inputMode="numeric" className={inputClass} /></Field>
        <Field label="Tu cargo (opcional)" htmlFor="be-role"><input id="be-role" name="role" placeholder="Talento humano, bienestar…" autoComplete="organization-title" className={inputClass} /></Field>
        <Field label="Tu nombre" htmlFor="be-name"><input id="be-name" name="name" required autoComplete="name" className={inputClass} /></Field>
        <Field label="Celular" htmlFor="be-phone"><input id="be-phone" name="phone" required inputMode="tel" autoComplete="tel" className={inputClass} /></Field>
        <Field label="Correo" htmlFor="be-email"><input id="be-email" name="email" type="email" autoComplete="email" className={inputClass} /></Field>
        <Field label="¿Cuándo te llamamos?" htmlFor="be-slot">
          <select id="be-slot" name="slot" defaultValue="manana" className={inputClass}>
            {(Object.entries(TIME_SLOTS) as [TimeSlot, string][]).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </Field>
      </div>
      <label className="flex gap-3 text-sm text-ink">
        <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-[var(--color-brand)]" />
        {CONSENTS.contact.text}
      </label>
      {error && <p role="alert" className="text-sm font-medium text-coral-ink">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Enviando…" : "Quiero que me contacten"}</Button>
    </form>
  );
}
