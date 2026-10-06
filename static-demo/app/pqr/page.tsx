import { ContentPage } from "@/components/ContentPage";
import { DefensorInfo } from "@/components/DefensorInfo";

export default function Page() {
  return (
    <ContentPage title="Peticiones, quejas y reclamos" intro="Te respondemos en máximo 15 días hábiles.">
      <p className="rounded-xl bg-sun-soft p-3 text-sm text-sun-ink">
        En la versión completa aquí radicas tu solicitud y recibes un número de radicado. Esta demo estática no
        tiene servidor.
      </p>
      <DefensorInfo />
    </ContentPage>
  );
}
