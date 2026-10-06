import Link from "next/link";
import { Logo } from "./Logo";
import { HeaderNav } from "./HeaderNav";
import { HeaderAccount } from "./HeaderAccount";

const NAV = [
  { href: "/cotizar", label: "Cotizar" },
  { href: "/como-funciona", label: "Cómo funciona" },
  { href: "/ayuda", label: "Ayuda" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 print:hidden border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="SeguAlaFija, inicio">
          <Logo />
        </Link>
        <HeaderNav items={NAV} />
        <HeaderAccount />
      </div>
    </header>
  );
}
