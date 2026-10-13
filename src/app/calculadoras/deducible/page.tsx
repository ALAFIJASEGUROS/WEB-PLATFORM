import type { Metadata } from "next";
import { CalculatorPage } from "@/components/calculators/CalculatorPage";
import { DeductibleCalculator } from "@/components/calculators/DeductibleCalculator";

export const metadata: Metadata = {
  title: "Calculadora de deducible",
  description: "Calcula cuánto pagas tú y cuánto paga la aseguradora en un choque, según el deducible de tu póliza.",
};

export default function Page() {
  return (
    <CalculatorPage
      title="Calculadora de deducible"
      intro="Cuánto pagas tú y cuánto paga la aseguradora si tienes un choque."
      after={
        <>
          <h2>¿Cómo funciona el deducible?</h2>
          <p>Casi todas las pólizas lo expresan como un porcentaje del daño con un mínimo en salarios mínimos. Pagas el mayor de los dos. Un deducible más alto baja el precio del seguro, pero te deja más gasto en cada reclamación.</p>
        </>
      }
    >
      <DeductibleCalculator />
    </CalculatorPage>
  );
}
