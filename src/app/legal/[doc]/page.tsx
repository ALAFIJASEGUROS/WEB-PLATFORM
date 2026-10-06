import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ContentPage } from "@/components/ContentPage";

const DOCS: Record<string, { title: string; body: ReactNode }> = {
  terminos: {
    title: "Términos y condiciones",
    body: (
      <>
        <p>SeguAlaFija es una plataforma que permite cotizar, comparar y comprar seguros de vehículos ofrecidos por aseguradoras autorizadas en Colombia. Las coberturas, exclusiones y condiciones de cada seguro son las del condicionado de la aseguradora.</p>
        <h2>Recomendaciones</h2>
        <p>La recomendación se basa en la información que suministras y en las condiciones informadas por las aseguradoras. Es una ayuda para decidir; la decisión final es tuya.</p>
        <h2>Precios</h2>
        <p>Los precios tienen la vigencia indicada en cada oferta y pueden cambiar si la información suministrada no es exacta.</p>
        <h2>Pagos</h2>
        <p>Los pagos se procesan a través de Wompi. SeguAlaFija no almacena datos de tarjetas.</p>
      </>
    ),
  },
  privacidad: {
    title: "Política de tratamiento de datos personales",
    body: (
      <>
        <p>En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013, informamos cómo tratamos tus datos.</p>
        <h2>Finalidades</h2>
        <ul>
          <li>Cotizar y recomendar seguros con base en la información que suministras.</li>
          <li>Transferir tus datos a la aseguradora que elijas para emitir y administrar la póliza.</li>
          <li>Enviarte la póliza, recordatorios de vencimientos y avisos de servicio.</li>
          <li>Solo con tu autorización separada y opcional: mostrarte ofertas de aseguradoras y aliados.</li>
        </ul>
        <h2>Tus derechos</h2>
        <p>Puedes conocer, actualizar, rectificar y suprimir tus datos, y revocar la autorización, escribiendo al canal de atención. Puedes retirar el consentimiento de marketing en cualquier momento desde tu perfil.</p>
        <h2>Contacto comercial</h2>
        <p>Respetamos los horarios y canales de contacto de la Ley 2300 de 2023.</p>
      </>
    ),
  },
  retracto: {
    title: "Derecho de retracto",
    body: (
      <>
        <p>En las ventas a distancia puedes retractarte de la compra dentro de los 5 días hábiles siguientes a la celebración del contrato, de acuerdo con el Estatuto del Consumidor (Ley 1480 de 2011), salvo que la cobertura ya se haya utilizado.</p>
        <p>Para ejercerlo, escríbenos indicando el número de póliza. Te devolveremos el dinero por el mismo medio de pago.</p>
      </>
    ),
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[doc]">): Promise<Metadata> {
  const { doc } = await params;
  return { title: DOCS[doc]?.title ?? "Legal" };
}

export default async function Page({ params }: PageProps<"/legal/[doc]">) {
  const { doc } = await params;
  const d = DOCS[doc];
  if (!d) notFound();
  return (
    <ContentPage title={d.title} draft>
      {d.body}
    </ContentPage>
  );
}
