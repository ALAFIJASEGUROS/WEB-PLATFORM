import type { Metadata } from "next";
import { AlertTriangle, Phone } from "lucide-react";
import { ContentPage } from "@/components/ContentPage";
import { InsurerLogo, SimulatedDataNotice } from "@/components/ui";
import { CLAIMS_GUIDES, GENERAL_STEPS } from "@/insurers/claims";

export const metadata: Metadata = {
  title: "Qué hacer en caso de siniestro",
  description: "Paso a paso si tienes un choque o te roban el vehículo, y cómo contactar a tu aseguradora.",
};

export default function Page() {
  return (
    <ContentPage title="¿Tuviste un siniestro?" intro="Qué hacer si tienes un choque o te roban el vehículo, paso a paso.">
      <p className="flex gap-2 rounded-2xl bg-coral-soft p-4 text-coral-ink">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
        <span>Si hay personas heridas, llama primero al <strong>123</strong>.</span>
      </p>

      <h2 id="accidente">Si tuviste un choque</h2>
      <ol>{GENERAL_STEPS.accidente.map((s) => <li key={s}>{s}</li>)}</ol>

      <h2 id="hurto">Si te robaron el vehículo</h2>
      <ol>{GENERAL_STEPS.hurto.map((s) => <li key={s}>{s}</li>)}</ol>

      <h2 id="documentos">Ten a mano</h2>
      <ul>{GENERAL_STEPS.documentos.map((s) => <li key={s}>{s}</li>)}</ul>

      <h2 id="aseguradoras">Contacto de tu aseguradora</h2>
      <SimulatedDataNotice />
      <div className="mt-4 space-y-4">
        {CLAIMS_GUIDES.map((g) => (
          <section key={g.insurerId} id={g.insurerId} aria-labelledby={`aseg-${g.insurerId}`} className="scroll-mt-24 rounded-2xl bg-surface p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3">
              <InsurerLogo id={g.insurerId} name={g.insurerName} />
              <h3 id={`aseg-${g.insurerId}`} className="text-lg font-bold text-heading">{g.insurerName}</h3>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              {g.channels.map((c) => (
                <p key={c.label} className="flex items-center gap-2 text-ink">
                  <Phone className="size-4 text-brand" aria-hidden />
                  {c.label}: {c.value && g.verifiedAt ? <strong>{c.value}</strong> : <span className="text-muted">usa el que aparece en tu póliza</span>}
                </p>
              ))}
            </div>
            {g.notes.map((n) => <p key={n} className="mt-2 text-sm text-muted">{n}</p>)}
            <p className="mt-2 text-xs text-muted">
              {g.verifiedAt ? `Contactos verificados el ${g.verifiedAt}.` : "Contactos pendientes de verificar con la aseguradora."}
            </p>
          </section>
        ))}
      </div>
    </ContentPage>
  );
}
