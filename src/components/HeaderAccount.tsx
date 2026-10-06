"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";
import { STATIC_DEMO } from "@/lib/api-client";
import { SESSION_EVENT } from "./SessionSync";

type Session = { name: string | null; email: string } | null;

export function HeaderAccount() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session>(null);

  // Se vuelve a consultar al navegar para reflejar inicio y cierre de sesión.
  useEffect(() => {
    if (STATIC_DEMO) return;
    let active = true;
    fetch("/api/sesion")
      .then((r) => (r.ok ? r.json() : null))
      .then((s: Session) => active && setSession(s))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    const onSession = (e: Event) => setSession((e as CustomEvent<Session>).detail);
    window.addEventListener(SESSION_EVENT, onSession);
    return () => window.removeEventListener(SESSION_EVENT, onSession);
  }, []);

  const label = session ? (session.name?.split(" ")[0] ?? session.email.split("@")[0]) : "Mi cuenta";
  const initial = label.charAt(0).toUpperCase();

  return (
    <Link
      href="/cuenta"
      aria-label={session ? `Mi cuenta (${session.email})` : "Mi cuenta"}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-line bg-surface pl-1.5 pr-4 text-sm font-semibold text-heading hover:border-brand"
    >
      {session ? (
        <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-brand-fill text-sm font-bold text-white">
          {initial}
        </span>
      ) : (
        <UserRound className="ml-1.5 size-4" aria-hidden />
      )}
      <span className="max-w-28 truncate">{label}</span>
    </Link>
  );
}
