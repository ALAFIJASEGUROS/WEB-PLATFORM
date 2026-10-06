"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, House, Search, ShieldCheck } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Inicio", icon: House, match: (p: string) => p === "/" },
  { href: "/cotizar", label: "Cotizar", icon: Search, match: (p: string) => p.startsWith("/cotizar") || p.startsWith("/resultados") || p.startsWith("/comparar") },
  { href: "/cuenta/seguros", label: "Mis seguros", icon: ShieldCheck, match: (p: string) => p.startsWith("/cuenta/seguros") },
  { href: "/cuenta/recordatorios", label: "Avisos", icon: Bell, match: (p: string) => p.startsWith("/cuenta/recordatorios") || p.startsWith("/cuenta/ofertas") },
];

const HIDDEN_ON = ["/checkout", "/pago"];

export function BottomNav() {
  const pathname = usePathname();
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;
  return (
    <nav
      aria-label="Navegación inferior"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 print:hidden border-t border-line bg-white md:hidden"
    >
      <ul className="grid grid-cols-4">
        {ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${active ? "text-brand" : "text-muted"}`}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
