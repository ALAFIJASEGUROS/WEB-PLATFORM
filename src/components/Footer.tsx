import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-white pb-24 md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted">
            Compara, entiende y compra tu seguro de carro o moto en minutos.
            Solo en Colombia.
          </p>
        </div>
        <nav aria-label="Legal" className="space-y-2 text-sm">
          <p className="font-semibold text-navy">Legal</p>
          <Link className="block text-muted hover:text-navy" href="/legal/terminos">Términos y condiciones</Link>
          <Link className="block text-muted hover:text-navy" href="/legal/privacidad">Política de tratamiento de datos</Link>
          <Link className="block text-muted hover:text-navy" href="/legal/retracto">Derecho de retracto</Link>
        </nav>
        <nav aria-label="Ayuda" className="space-y-2 text-sm">
          <p className="font-semibold text-navy">Ayuda</p>
          <Link className="block text-muted hover:text-navy" href="/como-funciona">Cómo funciona</Link>
          <Link className="block text-muted hover:text-navy" href="/ayuda">Preguntas frecuentes</Link>
        </nav>
      </div>
      <p className="border-t border-line px-4 py-4 text-center text-xs text-muted">
        Proyecto en desarrollo. Las aseguradoras mostradas y sus precios son
        simulados con fines de demostración.
      </p>
    </footer>
  );
}
