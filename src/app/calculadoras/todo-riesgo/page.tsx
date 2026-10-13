import type { Metadata } from "next";
import { CalculatorPage } from "@/components/calculators/CalculatorPage";
import { CoverageAdvisor } from "@/components/calculators/CoverageAdvisor";

export const metadata: Metadata = {
  title: "¿Todo riesgo o solo responsabilidad civil?",
  description: "Descubre qué cobertura le conviene a tu carro o moto según su valor, tus ahorros y si está financiado.",
};

export default function Page() {
  return (
    <CalculatorPage
      title="¿Todo riesgo o solo responsabilidad civil?"
      intro="Tres preguntas para saber qué cobertura te conviene."
      after={
        <>
          <h2>La regla de oro</h2>
          <p>Asegura lo que no podrías pagar de tu bolsillo. La responsabilidad civil siempre vale la pena: un accidente con heridos puede costar mucho más que tu vehículo.</p>
        </>
      }
    >
      <CoverageAdvisor />
    </CalculatorPage>
  );
}
