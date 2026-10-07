"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Botón fijo en el celular que aparece cuando el llamado principal de la
 * portada sale de la pantalla. Va sobre la barra de navegación inferior.
 */
export function StickyCta({ targetId }: { targetId: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    io.observe(target);
    return () => io.disconnect();
  }, [targetId]);

  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-16 z-30 px-4 pb-3 md:hidden print:hidden">
      <Link
        href="/cotizar"
        className="pointer-events-auto flex min-h-12 animate-[fade-up_.2s_ease-out] items-center justify-center gap-2 rounded-full bg-brand-fill px-6 font-semibold text-white shadow-lg hover:bg-brand-fill-hover"
      >
        Ver mis precios gratis <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
