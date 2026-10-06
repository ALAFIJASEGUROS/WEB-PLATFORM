import Link from "next/link";
import { UserRound } from "lucide-react";
import { Logo } from "./Logo";

const NAV = [
  { href: "/cotizar", label: "Cotizar" },
  { href: "/como-funciona", label: "Cómo funciona" },
  { href: "/ayuda", label: "Ayuda" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="SeguAlaFija, inicio">
          <Logo />
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-full px-4 py-2 text-sm font-semibold text-navy hover:bg-brand-soft"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/cuenta"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-line px-4 text-sm font-semibold text-navy hover:border-brand"
        >
          <UserRound className="size-4" aria-hidden />
          <span>Mi cuenta</span>
        </Link>
      </div>
    </header>
  );
}
