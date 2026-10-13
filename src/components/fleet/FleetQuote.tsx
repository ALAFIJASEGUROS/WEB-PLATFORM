"use client";

import { useState, type FormEvent } from "react";
import { Building2 } from "lucide-react";
import { CONSENTS } from "@/domain/consents";
import { MAX_FLEET, parsePlates, summarizeFleet, type FleetLine } from "@/domain/fleet";
import { CITIES, formatCOP } from "@/domain/labels";
import { TIME_SLOTS, type TimeSlot } from "@/domain/leads";
import type { Answers, VehicleUse } from "@/domain/types";
import { fetchQuote, lookupVehicle, requestCall } from "@/lib/api-client";
import { track } from "@/lib/analytics";
import { Button, Field, inputClass } from "@/components/ui";

const USES: { value: VehicleUse; label: string }[] = [
  { value: "domicilios", label: "Domicilios o mensajería" },
  { value: "trabajo", label: "Trabajo (visitas, ventas, transporte de empleados)" },
  { value: "particular", label: "Uso personal de empleados" },
];

/** Varias placas en una sola cotización, con la mejor opción por vehículo. */
export function FleetQuote() {
  const [text, setText] = useState("");
  const [use, setUse] = useState<VehicleUse>("domicilios");
  const [city, setCity] = useState("Bogotá");
  const [age, setAge] = useState(25);
  const [lines, setLines] = useState<FleetLine[] | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const parsed = parsePlates(text);

  async function quote() {
    const answers: Answers = {
      priority: "equilibrio",
      use,
      parking: "cerrado",
      mileage: use === "particular" ? "medio" : "alto",
      drivers: "varios",
      financed: false,
      deductibleTolerance: "medio",
      services: [],
      claimsLast3Years: 0,
    };
    const out: FleetLine[] = [];
    setLines(null);
    setProgress({ done: 0, total: parsed.plates.length });
    for (const { plate, type } of parsed.plates) {
      try {
        const vehicle = await lookupVehicle(plate);
        const res = await fetchQuote({ vehicle, driver: { birthdate: `${2026 - age}-01-15`, city }, answers });
        const best = res.offers[0];
        out.push({
          plate,
          type,
          vehicle: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
          ...(best ? { best: { insurerName: best.insurerName, planName: best.planName, annualPremium: best.annualPremium } } : { error: "Ningún plan aplica" }),
        });
      } catch {
        out.push({ plate, type, vehicle: "—", error: "No pudimos cotizarla" });
      }
      setProgress({ done: out.length, total: parsed.plates.length });
    }
    setLines(out);
    setProgress(null);
    const s = summarizeFleet(out);
    track("flota_cotizada", { vehiculos: s.vehicles, cotizados: s.quoted, uso: use });
  }

  const summary = lines && summarizeFleet(lines);

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
        <Field
          label="Placas de tus vehículos"
          htmlFor="fleet-plates"
          hint={`Separadas por comas o una por línea. Carros (ABC123) y motos (ABC12D), hasta ${MAX_FLEET}.`}
        >
          <textarea id="fleet-plates" rows={4} value={text} onChange={(e) => setText(e.target.value)} className={`${inputClass} py-3 font-mono uppercase`} placeholder={"ABC123\nXYZ12A"} />
        </Field>
        {(parsed.invalid.length > 0 || parsed.duplicates.length > 0 || parsed.tooMany) && (
          <ul className="space-y-1 text-sm text-coral-ink" role="status">
            {parsed.invalid.length > 0 && <li>No reconocemos: {parsed.invalid.join(", ")}</li>}
            {parsed.duplicates.length > 0 && <li>Repetidas (se cotizan una vez): {parsed.duplicates.join(", ")}</li>}
            {parsed.tooMany && <li>Cotizamos las primeras {MAX_FLEET}. Para flotas más grandes, pide la propuesta y te contactamos.</li>}
          </ul>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Uso principal" htmlFor="fleet-use">
            <select id="fleet-use" value={use} onChange={(e) => setUse(e.target.value as VehicleUse)} className={inputClass}>
              {USES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </Field>
          <Field label="Ciudad" htmlFor="fleet-city">
            <select id="fleet-city" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass}>
              {CITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Edad del conductor más joven" htmlFor="fleet-age">
            <input id="fleet-age" type="number" min={18} max={75} value={age} onChange={(e) => setAge(Math.min(75, Math.max(18, Number(e.target.value) || 18)))} className={inputClass} />
          </Field>
        </div>
        <Button className="w-full" onClick={quote} disabled={parsed.plates.length === 0 || !!progress}>
          {progress ? `Cotizando ${progress.done} de ${progress.total}…` : `Cotizar ${parsed.plates.length || ""} ${parsed.plates.length === 1 ? "vehículo" : "vehículos"}`}
        </Button>
      </div>

      {lines && summary && (
        <section aria-labelledby="fleet-result" className="space-y-4">
          <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
            <h2 id="fleet-result" className="text-sm font-semibold text-muted">Total estimado al año</h2>
            <p className="text-3xl font-extrabold tracking-tight text-heading">{formatCOP(summary.total)}</p>
            <p className="text-sm text-muted">
              {summary.quoted} de {summary.vehicles} vehículos cotizados ({summary.autos} carros, {summary.motos} motos). Con una propuesta para la flota completa
              pedimos a las aseguradoras condiciones por volumen.
            </p>
          </div>
          <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
            <table className="w-full text-sm">
              <caption className="sr-only">Mejor opción por vehículo</caption>
              <thead>
                <tr className="border-b border-line text-left">
                  <th scope="col" className="p-3">Placa</th>
                  <th scope="col" className="p-3">Vehículo</th>
                  <th scope="col" className="p-3">Recomendado</th>
                  <th scope="col" className="p-3 text-right">Al año</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.plate} className="border-b border-line last:border-0">
                    <th scope="row" className="p-3 text-left font-mono font-semibold">{l.plate}</th>
                    <td className="p-3">{l.vehicle}</td>
                    <td className="p-3">{l.best ? <>{l.best.planName} <span className="text-muted">· {l.best.insurerName}</span></> : <span className="text-coral-ink">{l.error}</span>}</td>
                    <td className="p-3 text-right tabular-nums">{l.best ? formatCOP(l.best.annualPremium) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ProposalForm lines={lines} total={summary.total} />
        </section>
      )}
    </div>
  );
}

function ProposalForm({ lines, total }: { lines: FleetLine[]; total: number }) {
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
        kind: "flota",
        name: String(f.get("name") ?? ""),
        phone: String(f.get("phone") ?? ""),
        email: String(f.get("email") ?? ""),
        slot: f.get("slot") as TimeSlot,
        contactConsent: f.get("consent") === "on",
        fleet: {
          company: String(f.get("company") ?? ""),
          nit: String(f.get("nit") ?? "") || undefined,
          vehicles: lines.length,
          total,
          plates: lines.map((l) => l.plate),
        },
      });
      track("llamada_solicitada", { tipo: "flota", vehiculos: lines.length });
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
        Recibimos tu solicitud. Un asesor empresarial te contactará con una propuesta para tu flota.
      </p>
    );
  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
      <h2 className="flex items-center gap-2 text-lg font-bold text-heading"><Building2 className="size-5 text-brand" aria-hidden /> Pide la propuesta para tu flota</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Empresa" htmlFor="fp-company"><input id="fp-company" name="company" required autoComplete="organization" className={inputClass} /></Field>
        <Field label="NIT (opcional)" htmlFor="fp-nit"><input id="fp-nit" name="nit" inputMode="numeric" className={inputClass} /></Field>
        <Field label="Tu nombre" htmlFor="fp-name"><input id="fp-name" name="name" required autoComplete="name" className={inputClass} /></Field>
        <Field label="Celular" htmlFor="fp-phone"><input id="fp-phone" name="phone" required inputMode="tel" autoComplete="tel" className={inputClass} /></Field>
        <Field label="Correo" htmlFor="fp-email"><input id="fp-email" name="email" type="email" autoComplete="email" className={inputClass} /></Field>
        <Field label="¿Cuándo te llamamos?" htmlFor="fp-slot">
          <select id="fp-slot" name="slot" defaultValue="manana" className={inputClass}>
            {(Object.entries(TIME_SLOTS) as [TimeSlot, string][]).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </Field>
      </div>
      <label className="flex gap-3 text-sm text-ink">
        <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-[var(--color-brand)]" />
        {CONSENTS.contact.text}
      </label>
      {error && <p role="alert" className="text-sm font-medium text-coral-ink">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Enviando…" : "Pedir la propuesta"}</Button>
    </form>
  );
}
