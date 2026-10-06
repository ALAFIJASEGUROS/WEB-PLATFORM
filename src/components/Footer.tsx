import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { VersionTag } from "./VersionTag";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-surface pb-24 md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted">
            Compara, entiende y compra tu seguro de carro o moto en minutos.
            Solo en Colombia.
          </p>
          <ThemeToggle />
        </div>
        <nav aria-label="Legal" className="space-y-2 text-sm">
          <p className="font-semibold text-heading">Legal</p>
          <Link className="block text-muted hover:text-heading" href="/legal/terminos">Términos y condiciones</Link>
          <Link className="block text-muted hover:text-heading" href="/legal/privacidad">Política de tratamiento de datos</Link>
          <Link className="block text-muted hover:text-heading" href="/legal/retracto">Derecho de retracto</Link>
        </nav>
        <nav aria-label="Ayuda" className="space-y-2 text-sm">
          <p className="font-semibold text-heading">Ayuda</p>
          <Link className="block text-muted hover:text-heading" href="/como-funciona">Cómo funciona</Link>
          <Link className="block text-muted hover:text-heading" href="/ayuda">Preguntas frecuentes</Link>
          <Link className="block text-muted hover:text-heading" href="/pqr">Peticiones, quejas y reclamos</Link>
        </nav>
      </div>
      <p className="border-t border-line px-4 py-4 text-center text-xs text-muted">
        Proyecto en desarrollo. Las aseguradoras mostradas y sus precios son
        simulados con fines de demostración.
      </p>
      <div className="flex justify-center px-4 pb-4">
        <VersionTag />
      </div>
    </footer>
  );
}
