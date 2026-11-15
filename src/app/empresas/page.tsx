import type { Metadata } from "next";
import { BadgeCheck, ClipboardCheck, EyeOff, HandCoins, Link2, ListChecks, ShieldCheck, Users } from "lucide-react";
import { Footer } from "@/components/Footer";
import { ButtonLink, SimulatedDataNotice } from "@/components/ui";
import { SavingsCalculator } from "@/components/benefit/SavingsCalculator";
import { BenefitRequestForm } from "@/components/benefit/BenefitRequestForm";
import { DEFAULT_TIERS, PAYMENT_MODEL_LABELS, type PaymentModel } from "@/domain/companies";

export const metadata: Metadata = {
  title: "Seguro de carro y moto como beneficio para tus empleados",
  description:
    "Ofrece a tu equipo el seguro de su carro o moto con Seguros Bolívar a tarifa corporativa: entre más empleados se inscriben, mejor precio. Sin costo para la empresa.",
};

const STEPS = [
  { icon: Link2, title: "Comparte un enlace", text: "Te damos un enlace y un código para tu equipo. También puedes cargar la lista en un archivo." },
  { icon: ListChecks, title: "Cada empleado cotiza y elige", text: "Entra con su correo, cotiza su carro o moto y elige entre los planes que habilitaste." },
  { icon: ClipboardCheck, title: "Tú apruebas", text: "Desde tu panel confirmas quién hace parte de la empresa. Nada más." },
  { icon: HandCoins, title: "Todos pagan menos", text: "Al cerrar la inscripción se fija el tramo de precio según cuántos se inscribieron." },
];

const PAYMENT_TEXT: Record<PaymentModel, string> = {
  empresa: "Lo ofreces como beneficio completo. Recibes un reporte mensual con el valor a pagar.",
  empleado: "Tu equipo accede a la tarifa corporativa y paga con tarjeta, PSE o descuento por nómina, con su autorización.",
  copago: "Aportas un monto fijo por empleado al año y cada persona paga la diferencia.",
};

const FAQ = [
  ["¿Cuánto le cuesta a la empresa?", "Nada. SeguAlaFija recibe la comisión de la aseguradora por cada póliza. Si eliges pagar todo o una parte, solo pagas las primas."],
  ["¿Qué ve la empresa de cada empleado?", "Nombre, correo, plan elegido, estado y valor. No ve su fecha de nacimiento, la placa ni las respuestas que dio para cotizar."],
  ["¿Qué pasa si un empleado sale de la empresa?", "Conserva su póliza hasta el vencimiento. Al renovar, la renueva a precio individual."],
  ["¿El empleado puede asegurar más de un vehículo?", "Sí, cada vehículo se cotiza por separado y todos cuentan para el tramo."],
  ["¿Con qué aseguradora?", "Con Seguros Bolívar. Los planes disponibles los eliges tú entre los de su catálogo para carros y motos."],
] as const;

export default function Page() {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center md:py-16">
          <div className="space-y-5">
            <p className="text-sm font-bold uppercase tracking-wide text-brand">Para empresas</p>
            <h1 className="text-[2.25rem] font-extrabold leading-[1.08] tracking-tight text-heading md:text-5xl">
              El seguro de su carro o moto, como beneficio para tu equipo
            </h1>
            <p className="max-w-xl text-lg text-muted">
              Tus empleados aseguran su vehículo con Seguros Bolívar a tarifa corporativa. Entre más personas se
              inscriben, mejor es el precio para todos. Cada quien gestiona su seguro; tú solo apruebas.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="#solicitud">Quiero el beneficio</ButtonLink>
              <ButtonLink href="#calculadora" variant="secondary">Calcular el ahorro</ButtonLink>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            {[
              { icon: BadgeCheck, text: `Hasta ${DEFAULT_TIERS.at(-1)!.discountPct} % de descuento por volumen` },
              { icon: Users, text: "Autogestión: cada empleado cotiza, elige y paga" },
              { icon: EyeOff, text: "La empresa no ve datos personales que no necesita" },
              { icon: ShieldCheck, text: "Sin costo para la empresa" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 rounded-2xl bg-canvas p-4 text-sm font-semibold text-ink">
                <Icon className="size-5 shrink-0 text-brand" aria-hidden /> {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12">
        <SimulatedDataNotice />

        <section aria-labelledby="como" className="space-y-6">
          <h2 id="como" className="text-2xl font-extrabold tracking-tight text-heading">Cómo funciona</h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="space-y-2 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
                <span className="flex items-center gap-2 text-sm font-bold text-brand">
                  <Icon className="size-5" aria-hidden /> Paso {i + 1}
                </span>
                <h3 className="font-bold text-heading">{title}</h3>
                <p className="text-sm text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="calculadora" className="space-y-6 scroll-mt-24">
          <div className="space-y-2">
            <h2 id="calculadora" className="text-2xl font-extrabold tracking-tight text-heading">¿Cuánto ahorra tu equipo?</h2>
            <p className="max-w-2xl text-muted">
              El descuento depende de cuántos empleados se inscriben al cerrar el periodo de inscripción. Los tramos son de
              ejemplo mientras cerramos la tarifa corporativa con Seguros Bolívar.
            </p>
          </div>
          <SavingsCalculator />
          <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
            <table className="w-full text-sm">
              <caption className="sr-only">Tramos de descuento por cantidad de empleados inscritos</caption>
              <thead>
                <tr className="border-b border-line text-left">
                  <th scope="col" className="p-3">Empleados inscritos</th>
                  <th scope="col" className="p-3 text-right">Descuento</th>
                </tr>
              </thead>
              <tbody>
                {DEFAULT_TIERS.map((t, i) => {
                  const next = DEFAULT_TIERS[i + 1];
                  return (
                    <tr key={t.minEmployees} className="border-b border-line last:border-0">
                      <th scope="row" className="p-3 text-left font-semibold tabular-nums">
                        {next ? `${t.minEmployees} a ${next.minEmployees - 1}` : `${t.minEmployees} o más`}
                      </th>
                      <td className="p-3 text-right font-bold tabular-nums text-heading">{t.discountPct} %</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="pago" className="space-y-6">
          <h2 id="pago" className="text-2xl font-extrabold tracking-tight text-heading">Tú decides quién paga</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {(Object.keys(PAYMENT_TEXT) as PaymentModel[]).map((m) => (
              <div key={m} className="space-y-2 rounded-[var(--radius-card)] border border-line bg-surface p-5">
                <h3 className="font-bold text-heading">{PAYMENT_MODEL_LABELS[m]}</h3>
                <p className="text-sm text-muted">{PAYMENT_TEXT[m]}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="preguntas" className="space-y-4">
          <h2 id="preguntas" className="text-2xl font-extrabold tracking-tight text-heading">Preguntas frecuentes</h2>
          <div className="divide-y divide-line rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group p-5">
                <summary className="cursor-pointer list-none font-semibold text-heading">{q}</summary>
                <p className="mt-2 text-sm text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="solicitud" aria-labelledby="solicitud-titulo" className="mx-auto max-w-3xl scroll-mt-24">
          <BenefitRequestForm />
        </section>
      </div>
      <Footer />
    </>
  );
}
