import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { ActionForm } from "@/components/account/ActionForm";
import { Field, inputClass } from "@/components/ui";
import { createPqrAction } from "./actions";
import { DefensorInfo } from "@/components/DefensorInfo";

export const metadata: Metadata = {
  title: "Peticiones, quejas y reclamos",
  description: "Radica una petición, queja, reclamo o sugerencia y consulta el Defensor del Consumidor Financiero.",
};

export default function Page() {
  return (
    <ContentPage title="Peticiones, quejas y reclamos" intro="Te respondemos en máximo 15 días hábiles.">
      <ActionForm action={createPqrAction} submitLabel="Radicar solicitud" className="space-y-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
        <Field label="Tipo de solicitud" htmlFor="pqr-type">
          <select id="pqr-type" name="type" className={inputClass} defaultValue="peticion">
            <option value="peticion">Petición</option>
            <option value="queja">Queja</option>
            <option value="reclamo">Reclamo</option>
            <option value="sugerencia">Sugerencia</option>
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre completo" htmlFor="pqr-name">
            <input id="pqr-name" name="name" required autoComplete="name" className={inputClass} />
          </Field>
          <Field label="Correo electrónico" htmlFor="pqr-email">
            <input id="pqr-email" name="email" type="email" required autoComplete="email" className={inputClass} />
          </Field>
        </div>
        <Field label="Número de póliza (opcional)" htmlFor="pqr-policy">
          <input id="pqr-policy" name="policyNumber" className={inputClass} />
        </Field>
        <Field label="Cuéntanos qué pasó" htmlFor="pqr-message">
          <textarea id="pqr-message" name="message" required minLength={20} rows={5} className={`${inputClass} py-3`} />
        </Field>
        <label className="flex gap-3 text-sm">
          <input type="checkbox" name="dataProcessing" required className="mt-0.5 size-5 shrink-0 accent-[var(--color-brand)]" />
          <span>Autorizo el tratamiento de mis datos para atender esta solicitud.</span>
        </label>
      </ActionForm>
      <DefensorInfo />
    </ContentPage>
  );
}
