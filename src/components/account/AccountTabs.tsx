"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/cuenta", label: "Resumen" },
  { href: "/cuenta/seguros", label: "Seguros y vehículos" },
  { href: "/cuenta/recordatorios", label: "Recordatorios" },
  { href: "/cuenta/ofertas", label: "Ofertas" },
  { href: "/cuenta/perfil", label: "Perfil" },
];

export function AccountTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Cuenta" className="hide-scrollbar -mx-4 mb-6 overflow-x-auto px-4">
      <ul className="flex gap-2">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold ${active ? "bg-navy text-white" : "bg-surface text-heading hover:bg-brand-soft"}`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
