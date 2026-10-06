"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function HeaderNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
      {items.map((n) => {
        const active = pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? "bg-brand-soft text-brand-strong" : "text-heading hover:bg-brand-soft"}`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
