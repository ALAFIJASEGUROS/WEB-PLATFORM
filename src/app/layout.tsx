import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SeguAlaFija · Compara y compra tu seguro de carro o moto",
    template: "%s · SeguAlaFija",
  },
  description:
    "Responde unas preguntas y te recomendamos el seguro de carro o moto que mejor se ajusta a ti. Compara aseguradoras y compra desde tu celular.",
  applicationName: "SeguAlaFija",
};

export const viewport: Viewport = {
  themeColor: "#0B3D91",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CO" className={`${jakarta.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2"
        >
          Saltar al contenido
        </a>
        <Header />
        <main id="contenido" className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
