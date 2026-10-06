import Link from "next/link";
import { UserRound } from "lucide-react";
import { Logo } from "./Logo";
import { HeaderNav } from "./HeaderNav";

const NAV = [
  { href: "/cotizar", label: "Cotizar" },
  { href: "/como-funciona", label: "Cómo funciona" },
  { href: "/ayuda", label: "Ayuda" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 print:hidden border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="SeguAlaFija, inicio">
          <Logo />
        </Link>
        <HeaderNav items={NAV} />
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
