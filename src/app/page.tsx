import Link from "next/link";
import {
  Bike,
  CarFront,
  ChartNoAxesColumn,
  CreditCard,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import { ButtonLink, Card } from "@/components/ui";
import { Footer } from "@/components/Footer";

const STEPS = [
  { icon: ListChecks, title: "Cuéntanos qué te importa", text: "Precio, cobertura o servicios. Son 2 minutos y no pedimos tu cédula para cotizar." },
  { icon: ChartNoAxesColumn, title: "Te recomendamos y explicamos", text: "Comparamos varias aseguradoras y te decimos por qué una opción encaja contigo." },
  { icon: CreditCard, title: "Compra desde tu celular", text: "Paga con PSE, tarjeta o Nequi a través de Wompi, sin crear cuenta." },
];

export default function Home() {
  return (
    <>
      <section className="bg-gradient-to-b from-brand-soft to-canvas">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-10 md:pb-20 md:pt-16">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-navy">
            <ShieldCheck className="size-4 text-mint" aria-hidden />
            Seguros de carro y moto en Colombia
          </p>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-navy md:text-5xl">
            El seguro que te sirve, explicado claro y a la fija.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Responde unas preguntas, compara aseguradoras y compra en minutos
            desde tu celular.
          </p>

          <div className="mt-8 grid max-w-xl grid-cols-2 gap-3">
            <Link
              href="/cotizar/auto"
              className="group flex flex-col gap-3 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)] transition hover:ring-2 hover:ring-brand"
            >
              <CarFront className="size-8 text-brand" aria-hidden />
              <span className="text-lg font-bold text-navy">Carro</span>
              <span className="text-sm font-semibold text-brand group-hover:underline">Cotizar →</span>
            </Link>
            <Link
              href="/cotizar/moto"
              className="group flex flex-col gap-3 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)] transition hover:ring-2 hover:ring-brand"
            >
              <Bike className="size-8 text-brand" aria-hidden />
              <span className="text-lg font-bold text-navy">Moto</span>
              <span className="text-sm font-semibold text-brand group-hover:underline">Cotizar →</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="como">
        <h2 id="como" className="text-2xl font-extrabold text-navy">
          Así funciona
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <s.icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm font-bold text-muted">Paso {i + 1}</span>
                </div>
                <h3 className="font-bold text-navy">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-start gap-4 rounded-[var(--radius-card)] bg-navy p-8 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold">Ten tus seguros en un solo lugar</h2>
            <p className="mt-1 text-white/80">
              Recordatorios de SOAT, tecnomecánica y renovaciones. Gratis.
            </p>
          </div>
          <ButtonLink href="/cuenta" variant="accent">
            Crear mi cuenta
          </ButtonLink>
        </div>
      </section>

      <Footer />
    </>
  );
}
