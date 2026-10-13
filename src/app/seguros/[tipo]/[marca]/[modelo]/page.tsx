import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calculator } from "lucide-react";
import { Footer } from "@/components/Footer";
import { ButtonLink, SimulatedDataNotice } from "@/components/ui";
import { formatCOP } from "@/domain/labels";
import { estimatePrice } from "@/insurers/estimate";
import { CURRENT_YEAR, findModel } from "@/vehicles/lookup";
import { findModelPage, modelPages, modelPath, type ModelPage } from "@/vehicles/pages";

export const dynamicParams = false;
export const generateStaticParams = () => modelPages().map(({ tipo, marca, modelo }) => ({ tipo, marca, modelo }));

const CITIES = ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena"];
const YEARS = [0, 3, 6, 10].map((n) => CURRENT_YEAR - n);
const REF_YEAR = CURRENT_YEAR - 3;

const estimate = (p: ModelPage, year = REF_YEAR, city = "Bogotá") =>
  estimatePrice({ type: p.type, brand: p.brand, model: p.model, year, city, age: 35 });

async function load(params: PageProps<"/seguros/[tipo]/[marca]/[modelo]">["params"]) {
  const { tipo, marca, modelo } = await params;
  return findModelPage(tipo, marca, modelo);
}

export async function generateMetadata({ params }: PageProps<"/seguros/[tipo]/[marca]/[modelo]">): Promise<Metadata> {
  const p = await load(params);
  if (!p) return {};
  const e = estimate(p);
  return {
    title: `Seguro para ${p.brand} ${p.model}: precios y coberturas`,
    description: `Seguro para ${p.tipo} ${p.brand} ${p.model} en Colombia desde ${e ? formatCOP(e.min) : ""} al año. Compara aseguradoras, coberturas y deducibles, y compra en línea.`,
    alternates: { canonical: modelPath(p) },
  };
}

export default async function Page({ params }: PageProps<"/seguros/[tipo]/[marca]/[modelo]">) {
  const p = await load(params);
  if (!p) notFound();
  const e = estimate(p)!;
  const name = `${p.brand} ${p.model}`;
  const noun = p.type === "auto" ? "carro" : "moto";
  const quoteHref = `/cotizar/${p.type}?marca=${encodeURIComponent(p.brand)}&modelo=${encodeURIComponent(p.model)}&origen=seo`;
  const newValue = findModel(p.type, p.brand, p.model)!.newValue;
  const siblings = modelPages().filter((x) => x.type === p.type && x.model !== p.model).slice(0, 6);

  const faqs = [
    {
      q: `¿Cuánto cuesta el seguro de un ${name}?`,
      a: `Para un ${name} ${REF_YEAR} en Bogotá, con un perfil típico, va de ${formatCOP(e.min)} a ${formatCOP(e.max)} al año${e.fullFrom ? `; el todo riesgo, desde ${formatCOP(e.fullFrom)}` : ""}. Tu precio depende de tu ciudad, tu edad, el uso y el año del ${noun}.`,
    },
    {
      q: `¿Es obligatorio asegurar mi ${noun}?`,
      a: `Solo el SOAT es obligatorio. El seguro voluntario cubre los daños a otros, a tu ${noun} y el hurto; es obligatorio si el ${noun} está financiado.`,
    },
    ...(p.type === "moto" && p.cc
      ? [{ q: `¿Qué planes aseguran una ${name} de ${p.cc} cc?`, a: `Algunos planes básicos solo aseguran motos de hasta 250 cc. Al cotizar te mostramos solo los planes que aceptan el cilindraje de tu moto y te explicamos por qué descartamos los demás.` }]
      : []),
    { q: "¿Qué es el deducible?", a: "La parte del daño que pagas tú cuando reclamas. Un deducible más alto baja el precio del seguro." },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <nav aria-label="Ruta" className="text-sm text-muted">
          <Link href={`/seguros/${p.tipo}`} className="hover:text-heading hover:underline">Seguro de {p.tipo}</Link> · {p.brand}
        </nav>
        <header className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-heading">Seguro para {name}</h1>
          <p className="text-lg text-muted">
            Desde <strong className="text-heading">{formatCOP(e.min)}</strong> al año
            {e.fullFrom && <> · todo riesgo desde <strong className="text-heading">{formatCOP(e.fullFrom)}</strong></>}
          </p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={quoteHref}>Ver mi precio exacto</ButtonLink>
            <ButtonLink href="/calculadoras/precio" variant="secondary"><Calculator className="size-4" aria-hidden /> Calculadora</ButtonLink>
          </div>
          <SimulatedDataNotice />
        </header>

        <section aria-labelledby="por-ano" className="space-y-2">
          <h2 id="por-ano" className="text-xl font-bold text-heading">Precio según el año del {noun}</h2>
          <p className="text-sm text-muted">Bogotá, conductor de 35 años, uso personal, sin siniestros. Valor nuevo de referencia: {formatCOP(newValue)}.</p>
          <PriceTable rows={YEARS.map((y) => ({ label: String(y), e: estimate(p, y) }))} first="Año" />
        </section>

        <section aria-labelledby="por-ciudad" className="space-y-2">
          <h2 id="por-ciudad" className="text-xl font-bold text-heading">Precio según la ciudad</h2>
          <p className="text-sm text-muted">{name} {REF_YEAR}, mismo perfil.</p>
          <PriceTable rows={CITIES.map((c) => ({ label: c, e: estimate(p, REF_YEAR, c) }))} first="Ciudad" />
        </section>

        <section aria-labelledby="preguntas" className="space-y-3">
          <h2 id="preguntas" className="text-xl font-bold text-heading">Preguntas frecuentes</h2>
          {faqs.map((f) => (
            <details key={f.q} className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-card)]">
              <summary className="cursor-pointer font-semibold text-heading">{f.q}</summary>
              <p className="mt-2 text-ink">{f.a}</p>
            </details>
          ))}
        </section>

        <section aria-labelledby="otros" className="space-y-2">
          <h2 id="otros" className="text-xl font-bold text-heading">Otros {p.type === "auto" ? "carros" : "motos"}</h2>
          <ul className="flex flex-wrap gap-2">
            {siblings.map((s) => (
              <li key={s.model}>
                <Link href={modelPath(s)} className="inline-flex min-h-11 items-center rounded-full border-2 border-line px-4 text-sm font-semibold text-heading hover:border-brand">
                  {s.brand} {s.model}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <Footer />
    </>
  );
}

function PriceTable({ rows, first }: { rows: { label: string; e: ReturnType<typeof estimatePrice> }[]; first: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-surface shadow-[var(--shadow-card)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="p-3">{first}</th>
            <th scope="col" className="p-3 text-right">Desde</th>
            <th scope="col" className="p-3 text-right">Todo riesgo desde</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ label, e }) => (
            <tr key={label} className="border-b border-line last:border-0">
              <th scope="row" className="p-3 text-left font-medium">{label}</th>
              <td className="p-3 text-right tabular-nums">{e ? formatCOP(e.min) : "—"}</td>
              <td className="p-3 text-right tabular-nums">{e?.fullFrom ? formatCOP(e.fullFrom) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
