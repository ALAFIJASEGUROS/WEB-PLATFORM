import type { Metadata } from "next";
import Link from "next/link";
import { Calculator, Scale, ShieldQuestion } from "lucide-react";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Calculadoras de seguros para carro y moto",
  description: "Calcula cuánto cuesta asegurar tu carro o moto, cuánto pagarías de deducible y si te conviene todo riesgo. Gratis y sin registro.",
};

const TOOLS = [
  { href: "/calculadoras/precio", icon: Calculator, title: "¿Cuánto cuesta asegurar mi carro o moto?", text: "Rango de precios por marca, línea, año y ciudad, sin dar tu placa." },
  { href: "/calculadoras/deducible", icon: Scale, title: "¿Cuánto pagaría de deducible?", text: "Cuánto pagas tú y cuánto la aseguradora en un choque." },
  { href: "/calculadoras/todo-riesgo", icon: ShieldQuestion, title: "¿Todo riesgo o solo RC?", text: "Qué cobertura te conviene según tu vehículo y tus ahorros." },
];

export default function Page() {
  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-heading">Calculadoras</h1>
        <p className="mt-2 text-lg text-muted">Respuestas rápidas antes de cotizar. Gratis y sin registro.</p>
        <ul className="mt-6 grid gap-3">
          {TOOLS.map(({ href, icon: Icon, title, text }) => (
            <li key={href}>
              <Link href={href} className="flex items-start gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)] hover:ring-2 hover:ring-brand">
                <Icon className="mt-1 size-6 shrink-0 text-brand" aria-hidden />
                <span>
                  <span className="block font-bold text-heading">{title}</span>
                  <span className="block text-sm text-muted">{text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <Footer />
    </>
  );
}
