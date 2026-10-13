import type { Metadata } from "next";
import { CalculatorPage } from "@/components/calculators/CalculatorPage";
import { PriceCalculator } from "@/components/calculators/PriceCalculator";

export const metadata: Metadata = {
  title: "¿Cuánto cuesta asegurar mi carro o moto?",
  description: "Calcula el precio de referencia del seguro de tu carro o moto por marca, línea, año y ciudad, sin dar tu placa.",
};

export default function Page() {
  return (
    <CalculatorPage
      title="¿Cuánto cuesta asegurar mi carro o moto?"
      intro="Un rango de referencia sin dar tu placa. Para tu precio exacto, cotiza con la placa en un par de minutos."
      after={
        <>
          <h2>¿De qué depende el precio?</h2>
          <p>Del valor del vehículo, la ciudad, la edad de quien maneja, el uso, dónde lo parqueas y los siniestros recientes. Por eso dos personas con el mismo modelo pueden pagar precios distintos.</p>
        </>
      }
    >
      <PriceCalculator />
    </CalculatorPage>
  );
}
