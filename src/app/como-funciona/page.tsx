import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { ButtonLink } from "@/components/ui";
import { PRIORITY_WEIGHTS } from "@/recommendation/scoring";
import { PRIORITY_LABELS } from "@/domain/labels";
import type { Priority } from "@/domain/types";

export const metadata: Metadata = {
  title: "Cómo funciona",
  description: "Cómo cotizamos, cómo recomendamos y cómo ganamos dinero. Transparencia total.",
};

export default function Page() {
  return (
    <ContentPage title="Cómo funciona" intro="Transparencia sobre cómo cotizamos, recomendamos y ganamos dinero.">
      <h2>1. Cotizamos con varias aseguradoras a la vez</h2>
      <p>
        Con los datos de tu vehículo, tu edad y tu ciudad consultamos a las aseguradoras conectadas.
        Si alguna no responde a tiempo, te mostramos las demás y te avisamos.
      </p>

      <h2>2. Calculamos tu afinidad con cada opción</h2>
      <p>Cada opción recibe un puntaje de 0 a 100 que combina tres dimensiones según tu prioridad:</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-muted"><th className="p-2">Tu prioridad</th><th className="p-2">Precio</th><th className="p-2">Cobertura</th><th className="p-2">Servicios</th></tr></thead>
          <tbody>
            {(Object.keys(PRIORITY_WEIGHTS) as Priority[]).map((p) => (
              <tr key={p} className="border-t border-line">
                <td className="p-2 font-semibold">{PRIORITY_LABELS[p]}</td>
                <td className="p-2">{PRIORITY_WEIGHTS[p].price * 100}%</td>
                <td className="p-2">{PRIORITY_WEIGHTS[p].coverage * 100}%</td>
                <td className="p-2">{PRIORITY_WEIGHTS[p].services * 100}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Además ajustamos el resultado si tu vehículo está financiado (los bancos suelen exigir daños y
        hurto), si se parquea en la calle (el hurto pesa más), si lo usas para trabajar (accidentes
        personales y responsabilidad civil pesan más) o si el deducible es mayor al que prefieres.
      </p>

      <h2>3. La comisión no cambia el orden</h2>
      <p>
        Cuando compras, la aseguradora nos paga una comisión. Esa comisión no forma parte del puntaje
        de recomendación y el precio que ves es el mismo que pagarías directamente. Las ofertas
        patrocinadas siempre se marcan como publicidad.
      </p>

      <h2>4. Compras desde el celular</h2>
      <p>Pagas a través de Wompi y recibes tu póliza por correo. Si creas una cuenta, te recordamos renovaciones, SOAT y tecnomecánica.</p>

      <ButtonLink href="/cotizar" className="mt-4">Cotizar ahora</ButtonLink>
    </ContentPage>
  );
}
