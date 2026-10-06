import Link from "next/link";
import {
  BellRing,
  Bike,
  CarFront,
  ChartNoAxesColumn,
  Check,
  CreditCard,
  Eye,
  KeyRound,
  LifeBuoy,
  ListChecks,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { ButtonLink, Card } from "@/components/ui";
import { Footer } from "@/components/Footer";

const STEPS = [
  { icon: ListChecks, title: "Cuéntanos qué te importa", text: "Precio, cobertura o servicios. Son 2 minutos y no pedimos tu cédula para cotizar." },
  { icon: ChartNoAxesColumn, title: "Te recomendamos y explicamos", text: "Comparamos varias aseguradoras y te decimos por qué una opción encaja contigo." },
  { icon: CreditCard, title: "Compra desde tu celular", text: "Paga con PSE, tarjeta o Nequi a través de Wompi, sin crear cuenta." },
];

const BENEFITS = [
  { icon: Eye, title: "Transparente", text: "Te mostramos cómo calculamos la recomendación. La comisión no cambia el orden." },
  { icon: Smartphone, title: "Hecho para el celular", text: "Cotiza, compara y paga en una sola mano, desde donde estés." },
  { icon: BellRing, title: "Te avisamos a tiempo", text: "Renovación, SOAT, tecnomecánica y cuotas, por correo o WhatsApp." },
];

const INSURERS = ["SURA", "Seguros Bolívar"];

const COVERAGES = [
  { icon: Users, tone: "bg-brand-soft text-brand", title: "Responsabilidad civil", text: "Paga los daños que le causes a otras personas o a sus bienes. Es la base de cualquier póliza." },
  { icon: Wrench, tone: "bg-sun-soft text-sun-ink", title: "Daños a tu vehículo", text: "Cubre el arreglo si chocas. La pérdida parcial es para arreglos y la total para cuando no vale la pena repararlo." },
  { icon: KeyRound, tone: "bg-coral-soft text-coral", title: "Hurto", text: "Te pagan el valor del vehículo si lo roban, y en algunos planes también las partes robadas." },
  { icon: LifeBuoy, tone: "bg-mint-soft text-mint", title: "Asistencias", text: "Grúa, vehículo de reemplazo, conductor elegido o asistencia jurídica. Varían mucho entre planes." },
];

function HeroPreview() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-sm">
      <div className="absolute -right-4 -top-4 size-40 rounded-full bg-mint/15 blur-2xl" />
      <div className="absolute -bottom-6 -left-6 size-40 rounded-full bg-brand/15 blur-2xl" />
      <div className="relative rotate-2 rounded-[var(--radius-card)] bg-surface/70 p-4 shadow-[var(--shadow-card)]">
        <div className="h-3 w-24 rounded bg-line" />
        <div className="mt-2 h-3 w-16 rounded bg-line" />
      </div>
      <div className="relative -mt-10 -rotate-1 rounded-[var(--radius-card)] bg-surface p-5 shadow-[0_12px_40px_rgb(11_61_145/0.16)]">
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-strong">
          <Sparkles className="size-3" /> Recomendado para ti
        </span>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-[#00843d] text-sm font-extrabold text-white">BO</span>
          <div className="flex-1">
            <p className="font-bold text-heading">Auto Plus</p>
            <p className="text-sm text-muted">Seguros Bolívar</p>
          </div>
          <span className="text-lg font-extrabold text-mint">92</span>
        </div>
        <p className="mt-4 text-2xl font-extrabold tracking-tight text-heading">
          $1.513.000<span className="text-sm font-semibold text-muted"> /año</span>
        </p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {["Vehículo de reemplazo 10 días", "Pérdida parcial por hurto", "Deducible 10%"].map((t) => (
            <li key={t} className="flex items-center gap-2"><Check className="size-4 text-mint" />{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <section className="overflow-hidden bg-gradient-to-b from-brand-soft via-brand-soft/60 to-canvas">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-8 md:grid-cols-[1.1fr_1fr] md:pb-20 md:pt-16">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-heading shadow-sm">
              <ShieldCheck className="size-4 text-mint" aria-hidden />
              Seguros de carro y moto en Colombia
            </p>
            <h1 className="text-[2.5rem] font-extrabold leading-[1.05] tracking-tight text-heading md:text-6xl">
              El seguro que te sirve, <span className="text-brand">a la fija.</span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted">
              Responde unas preguntas y te recomendamos el seguro que mejor encaja contigo. Compara
              aseguradoras y compra en minutos desde tu celular.
            </p>

            <div className="mt-7 grid max-w-md grid-cols-2 gap-3">
              {[
                { href: "/cotizar/auto", icon: CarFront, label: "Carro" },
                { href: "/cotizar/moto", icon: Bike, label: "Moto" },
              ].map((o) => (
                <Link
                  key={o.href}
                  href={o.href}
                  className="group flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:ring-2 hover:ring-brand"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-brand-fill text-white">
                    <o.icon className="size-6" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-bold text-heading">{o.label}</span>
                    <span className="block text-xs font-semibold text-brand group-hover:underline">Cotizar →</span>
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">Gratis · Sin registro · Sin llamadas de vendedores</p>
          </div>
          <HeroPreview />
        </div>
      </section>

      <section aria-label="Aseguradoras" className="border-y border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-5 text-sm">
          <span className="text-muted">Comparamos opciones de</span>
          {INSURERS.map((n) => (
            <span key={n} className="font-extrabold tracking-tight text-heading/70">{n}</span>
          ))}
          <span className="text-muted">y pronto más</span>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="como">
        <h2 id="como" className="text-2xl font-extrabold tracking-tight text-heading md:text-3xl">Así de fácil</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <s.icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-4xl font-extrabold text-line">{i + 1}</span>
                </div>
                <h3 className="font-bold text-heading">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14" aria-labelledby="cubre">
        <div className="grid gap-8 md:grid-cols-[1fr_2fr] md:items-start">
          <div>
            <h2 id="cubre" className="text-2xl font-extrabold tracking-tight text-heading md:text-3xl">
              ¿Qué cubre un seguro de carro o moto?
            </h2>
            <p className="mt-3 text-muted">
              El SOAT es obligatorio y cubre a las personas lesionadas. El seguro voluntario protege
              tu vehículo y tu bolsillo frente a terceros. Estas son las coberturas que comparamos:
            </p>
            <Link href="/ayuda" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">
              Más preguntas frecuentes →
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {COVERAGES.map((c) => (
              <li key={c.title} className="flex gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${c.tone}`}>
                  <c.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-bold text-heading">{c.title}</h3>
                  <p className="mt-1 text-sm text-muted">{c.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-surface py-14" aria-labelledby="por-que">
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="por-que" className="text-2xl font-extrabold tracking-tight text-heading md:text-3xl">¿Por qué SeguAlaFija?</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-mint-soft text-mint">
                  <b.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-bold text-heading">{b.title}</h3>
                  <p className="mt-1 text-sm text-muted">{b.text}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/como-funciona" className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-brand underline-offset-4 hover:underline">
            Así calculamos la recomendación →
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-14">
        <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-navy p-8 text-white md:flex md:items-center md:justify-between md:p-10">
          <div className="absolute -right-10 -top-10 size-48 rounded-full bg-brand/30 blur-2xl" aria-hidden />
          <div className="relative">
            <h2 className="text-2xl font-extrabold">Ten tus seguros en un solo lugar</h2>
            <p className="mt-1 max-w-md text-white/80">
              Guarda tus pólizas, aunque sean de otra aseguradora, y recibe recordatorios. Gratis.
            </p>
          </div>
          <ButtonLink href="/cuenta" variant="accent" className="relative mt-5 md:mt-0">
            Crear mi cuenta
          </ButtonLink>
        </div>
      </section>

      <Footer />
    </>
  );
}
