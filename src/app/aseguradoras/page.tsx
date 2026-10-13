import type { Metadata } from "next";
import { Star } from "lucide-react";
import { ContentPage } from "@/components/ContentPage";
import { InsurerLogo } from "@/components/ui";
import { MOCK_INSURERS } from "@/insurers/mock/insurers";
import { formatScore, REPUTATION_SOURCE, reputationFor, SCORE_THRESHOLDS } from "@/insurers/reputation";

export const metadata: Metadata = {
  title: "Calificación de las aseguradoras",
  description: "Cómo responden las aseguradoras de carros y motos: quejas, días para pagar un siniestro y reclamaciones pagadas.",
};

export default function Page() {
  const rows = MOCK_INSURERS.map((a) => ({ id: a.id, name: a.name, r: reputationFor(a.id) })).filter((x) => x.r);
  return (
    <ContentPage
      title="Calificación de las aseguradoras"
      intro="No solo importa el precio: también cómo responde la aseguradora cuando la necesitas."
    >
      {REPUTATION_SOURCE.simulated && (
        <p className="rounded-xl bg-sun-soft p-3 text-sm text-sun-ink">
          Datos simulados con fines de demostración. En la versión en operación se toman de los informes públicos
          del periodo {REPUTATION_SOURCE.period}.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(({ id, name, r }) => (
          <section key={id} id={id} aria-labelledby={`${id}-t`} className="scroll-mt-24 rounded-2xl bg-surface p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3">
              <InsurerLogo id={id} name={name} />
              <h2 id={`${id}-t`} className="!mt-0 flex-1 !text-lg">{name}</h2>
              <p className="flex items-center gap-1 text-2xl font-extrabold text-heading">
                <Star className="size-5 fill-current text-sun" aria-hidden />
                {formatScore(r!.score)}
                <span className="text-sm font-semibold text-muted">/5</span>
              </p>
            </div>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">Quejas por cada 10.000 pólizas</dt><dd className="font-semibold">{formatScore(r!.complaintsPer10k)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Días para pagar un siniestro</dt><dd className="font-semibold">{r!.claimPaymentDays}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Reclamaciones pagadas</dt><dd className="font-semibold">{r!.claimsPaidPct}%</dd></div>
            </dl>
          </section>
        ))}
      </div>
      <h2>Cómo calculamos la calificación</h2>
      <p>
        Llevamos cada indicador a una escala de 1 a 5 con umbrales fijos y sacamos el promedio. Los umbrales son los
        mismos para todas las aseguradoras y ninguna paga por aparecer mejor calificada.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Umbrales de la calificación</caption>
          <thead>
            <tr className="border-b border-line"><th scope="col" className="py-2 pr-3">Indicador</th><th scope="col" className="py-2 pr-3">Da 1</th><th scope="col" className="py-2">Da 5</th></tr>
          </thead>
          <tbody>
            {SCORE_THRESHOLDS.map((t) => (
              <tr key={t.label} className="border-b border-line"><th scope="row" className="py-2 pr-3 font-medium">{t.label}</th><td className="py-2 pr-3">{t.bad}</td><td className="py-2">{t.good}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>La calificación se muestra junto a cada oferta, pero no cambia el orden de la recomendación.</p>
      <h2>Fuentes</h2>
      <ul>{REPUTATION_SOURCE.sources.map((s) => <li key={s}>{s}</li>)}</ul>
    </ContentPage>
  );
}
