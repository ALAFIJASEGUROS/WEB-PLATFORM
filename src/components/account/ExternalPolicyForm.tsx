"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import type { ParsedPolicy } from "@/domain/policy-pdf";
import { Field, inputClass } from "@/components/ui";
import { ActionForm } from "./ActionForm";
import type { FormState } from "@/app/cuenta/actions";

interface VehicleOption {
  id: string;
  plate: string;
  label: string;
}

const FIELD_LABELS: Record<keyof ParsedPolicy, string> = {
  insurerName: "aseguradora",
  number: "número",
  planName: "plan",
  startDate: "inicio",
  endDate: "fin",
  plate: "placa",
  annualPremium: "prima",
};

/** Registro de una póliza externa, con opción de prellenar los datos desde el PDF. */
export function ExternalPolicyForm({
  action,
  vehicles,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  vehicles: VehicleOption[];
}) {
  const [fields, setFields] = useState<ParsedPolicy>({});
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [reading, setReading] = useState(false);

  async function readPdf(file: File | undefined) {
    if (!file) return;
    setReading(true);
    setStatus(null);
    try {
      const body = new FormData();
      body.set("archivo", file);
      const res = await fetch("/api/polizas/leer", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { fields?: ParsedPolicy; error?: string };
      if (!res.ok || !data.fields) {
        setStatus({ tone: "error", text: data.error ?? "No pudimos leer el PDF." });
        return;
      }
      const found = Object.keys(data.fields) as (keyof ParsedPolicy)[];
      setFields(data.fields);
      setVersion((v) => v + 1);
      setStatus(
        found.length
          ? { tone: "ok", text: `Encontramos: ${found.map((k) => FIELD_LABELS[k]).join(", ")}. Revisa y completa lo que falte antes de guardar.` }
          : { tone: "error", text: "No encontramos datos de la póliza en el PDF. Complétalos a mano." },
      );
    } catch {
      setStatus({ tone: "error", text: "No pudimos leer el PDF." });
    } finally {
      setReading(false);
    }
  }

  const vehicleId = vehicles.find((v) => v.plate === fields.plate)?.id ?? vehicles[0]?.id;
  const plateUnknown = fields.plate && !vehicles.some((v) => v.plate === fields.plate);

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl border border-dashed border-line p-4">
        <label htmlFor="ep-pdf" className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand">
          <FileText className="size-4" aria-hidden /> {reading ? "Leyendo el PDF…" : "Llenar desde el PDF de mi póliza"}
        </label>
        <input
          id="ep-pdf"
          type="file"
          accept="application/pdf"
          className="mt-2 block w-full text-sm text-muted file:mr-3 file:min-h-10 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:font-semibold file:text-brand"
          disabled={reading}
          onChange={(e) => readPdf(e.target.files?.[0])}
        />
        <p className="mt-1 text-xs text-muted">Solo leemos el texto para llenar el formulario; no guardamos el archivo. Máximo 5 MB.</p>
        {status && (
          <p role={status.tone === "error" ? "alert" : "status"} className={`mt-2 text-sm ${status.tone === "error" ? "text-coral-ink" : "text-mint"}`}>
            {status.text}
          </p>
        )}
        {plateUnknown && (
          <p className="mt-1 text-sm text-muted">La placa {fields.plate} no está en tus vehículos: agrégala arriba o elige el vehículo correcto.</p>
        )}
      </div>

      <ActionForm key={version} action={action} submitLabel="Registrar póliza" className="grid gap-3 sm:grid-cols-2">
        <Field label="Aseguradora" htmlFor="ep-ins"><input id="ep-ins" name="insurerName" required defaultValue={fields.insurerName} className={inputClass} /></Field>
        <Field label="Producto o plan" htmlFor="ep-plan"><input id="ep-plan" name="planName" required defaultValue={fields.planName} className={inputClass} /></Field>
        <Field label="Número de póliza" htmlFor="ep-num"><input id="ep-num" name="number" required defaultValue={fields.number} className={inputClass} /></Field>
        <Field label="Vehículo" htmlFor="ep-veh">
          <select id="ep-veh" name="vehicleId" required defaultValue={vehicleId} className={inputClass}>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="Inicio de vigencia" htmlFor="ep-start"><input id="ep-start" name="startDate" type="date" required defaultValue={fields.startDate} className={inputClass} /></Field>
        <Field label="Fin de vigencia" htmlFor="ep-end"><input id="ep-end" name="endDate" type="date" required defaultValue={fields.endDate} className={inputClass} /></Field>
        <Field label="Prima anual (opcional)" htmlFor="ep-prem" hint="Queda en tu billetera junto con la póliza.">
          <input id="ep-prem" name="annualPremium" type="number" min="0" step="1000" inputMode="numeric" defaultValue={fields.annualPremium} className={inputClass} />
        </Field>
      </ActionForm>
    </div>
  );
}
