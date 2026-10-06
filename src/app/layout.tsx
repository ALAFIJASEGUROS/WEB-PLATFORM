import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("saf:theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0B3D91" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1220" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CO" className={`${jakarta.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Aplica el tema guardado antes de pintar para evitar el parpadeo. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
        >
          Saltar al contenido
        </a>
        <Header />
        <main id="contenido" className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
        <BottomNav />
        <ServiceWorker />
      </body>
    </html>
  );
}
