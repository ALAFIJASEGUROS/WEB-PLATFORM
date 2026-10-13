"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui";

/** Copiar el enlace de invitación o enviarlo por WhatsApp. */
export function InviteShare({ link, discount }: { link: string; discount: string }) {
  const [copied, setCopied] = useState(false);
  const text = `Yo comparé y compré mi seguro en SeguAlaFija. Con mi enlace tienes ${discount} de descuento: ${link}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* el portapapeles puede no estar disponible */
    }
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button variant="secondary" onClick={copy} aria-live="polite">
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {copied ? "Enlace copiado" : "Copiar enlace"}
      </Button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1f7a4d] px-5 font-semibold text-white hover:opacity-90"
      >
        <MessageCircle className="size-4" aria-hidden /> Enviar por WhatsApp
      </a>
    </div>
  );
}
