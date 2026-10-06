import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Ayuda y preguntas frecuentes",
  description: "Resolvemos tus dudas sobre seguros de carro y moto, pagos, pólizas y siniestros.",
};

const FAQ = [
  ["¿Necesito crear una cuenta para comprar?", "No. Puedes cotizar y comprar sin registrarte. Te enviamos la póliza al correo. Si luego creas una cuenta con ese mismo correo, verás allí tus pólizas."],
  ["¿Por qué no me piden la cédula para cotizar?", "Para mostrarte precios solo necesitamos datos del vehículo, tu edad y tu ciudad. Pedimos documento únicamente al comprar, porque la aseguradora lo necesita para emitir la póliza."],
  ["¿Cómo eligen la opción recomendada?", "Calculamos un puntaje de afinidad con tres dimensiones: precio, cobertura (incluido el deducible y el límite de responsabilidad civil) y servicios. El peso de cada una depende de lo que nos dijiste que es más importante para ti. Siempre ves todas las opciones."],
  ["¿Este seguro reemplaza el SOAT?", "No. El SOAT es obligatorio y cubre a las personas lesionadas en un accidente. El seguro voluntario cubre daños a tu vehículo, hurto y responsabilidad civil frente a terceros."],
  ["¿Qué es el deducible?", "Es la parte de la pérdida que pagas tú cuando haces una reclamación. Un deducible más alto suele bajar el precio del seguro."],
  ["¿Qué medios de pago aceptan?", "A través de Wompi: tarjeta débito o crédito, PSE, Nequi y botón Bancolombia."],
  ["¿Puedo arrepentirme de la compra?", "Sí. En ventas a distancia tienes derecho de retracto. Revisa las condiciones en la página de derecho de retracto."],
  ["¿Los precios que veo son reales?", "Esta versión es una demostración: los planes, precios y condiciones de las aseguradoras son simulados."],
];

export default function Page() {
  return (
    <ContentPage title="Ayuda" intro="Respuestas rápidas a las dudas más comunes.">
      <div className="space-y-2">
        {FAQ.map(([q, a]) => (
          <details key={q} className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-card)]">
            <summary className="cursor-pointer font-semibold text-heading">{q}</summary>
            <p className="mt-2 text-muted">{a}</p>
          </details>
        ))}
      </div>

      <h2 id="siniestros">¿Tuviste un accidente?</h2>
      <ul>
        <li>Si hay heridos, llama al 123 y no muevas los vehículos hasta que llegue la autoridad.</li>
        <li>Toma fotos de los vehículos, las placas y el lugar.</li>
        <li>Llama a la línea de asistencia de tu aseguradora con tu número de póliza (lo encuentras en tu cuenta o en el correo de confirmación).</li>
        <li>Si solo hay daños materiales, pueden llegar a un acuerdo y retirar los vehículos.</li>
      </ul>

      <h2>¿Necesitas hablar con alguien?</h2>
      <a
        href="https://wa.me/570000000000?text=Hola%2C%20necesito%20ayuda%20con%20mi%20seguro"
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-mint px-6 font-semibold text-white"
      >
        <MessageCircle className="size-5" aria-hidden /> Escríbenos por WhatsApp
      </a>
      <p className="text-sm text-muted">(Número de demostración, aún no habilitado.)</p>
    </ContentPage>
  );
}
