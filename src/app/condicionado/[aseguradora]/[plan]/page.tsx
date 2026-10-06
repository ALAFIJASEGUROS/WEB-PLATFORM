import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/ContentPage";
import { COVERAGE_LABELS, formatMillions, SERVICE_LABELS } from "@/domain/labels";
import { COMMON_EXCLUSIONS } from "@/insurers/mock/tariff";
import { BOLIVAR_CONFIG, SURA_CONFIG } from "@/insurers/mock/insurers";

const CONFIGS = [SURA_CONFIG, BOLIVAR_CONFIG];

function find(aseguradora: string, plan: string) {
  const config = CONFIGS.find((c) => c.id === aseguradora);
  const p = config?.plans.find((x) => x.code === plan);
  return config && p ? { config, plan: p } : null;
}

export function generateStaticParams() {
  return CONFIGS.flatMap((c) => c.plans.map((p) => ({ aseguradora: c.id, plan: p.code })));
}

export async function generateMetadata({ params }: PageProps<"/condicionado/[aseguradora]/[plan]">): Promise<Metadata> {
  const { aseguradora, plan } = await params;
  const f = find(aseguradora, plan);
  return { title: f ? `Condicionado ${f.plan.name} · ${f.config.name}` : "Condicionado" };
}

export default async function Page({ params }: PageProps<"/condicionado/[aseguradora]/[plan]">) {
  const { aseguradora, plan } = await params;
  const f = find(aseguradora, plan);
  if (!f) notFound();
  const { config, plan: p } = f;
  return (
    <ContentPage title={`${p.name} · ${config.name}`} intro="Resumen del condicionado del plan.">
      <p className="rounded-xl bg-sun-soft p-3 text-sm text-sun-ink">
        Documento simulado con fines de demostración. El condicionado real lo publica cada aseguradora y está
        depositado ante la Superintendencia Financiera.
      </p>
      <h2>Coberturas</h2>
      <ul>
        {p.coverages.map((k) => (
          <li key={k}>
            {COVERAGE_LABELS[k]}
            {k === "rc" && ` hasta ${formatMillions(p.rcLimit)}`}
          </li>
        ))}
      </ul>
      <h2>Deducible</h2>
      <p>{p.deductiblePct ? `${p.deductiblePct}% del valor de la pérdida, mínimo ${p.deductibleMinSmmlv} SMMLV.` : "Este plan no tiene deducible."}</p>
      <h2>Asistencias</h2>
      <ul>
        {p.services.map((s) => (
          <li key={s}>{SERVICE_LABELS[s]}{s === "autoSustituto" && ` (${p.substituteCarDays} días)`}</li>
        ))}
      </ul>
      <h2>Exclusiones principales</h2>
      <ul>
        {[...COMMON_EXCLUSIONS, ...p.exclusions].map((e) => <li key={e}>{e}</li>)}
      </ul>
      <h2>Prima e impuestos</h2>
      <p>La prima mostrada en la cotización incluye el IVA del 19%. En el resumen de compra verás el desglose.</p>
    </ContentPage>
  );
}
