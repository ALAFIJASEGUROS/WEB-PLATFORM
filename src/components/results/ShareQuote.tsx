"use client";

import { useState } from "react";
import { MessageCircle, Share2 } from "lucide-react";
import type { QuoteRequest } from "@/domain/types";
import { encodeShare } from "@/lib/share";

export function shareUrl(req: QuoteRequest) {
  return `${window.location.origin}${window.location.pathname}?c=${encodeShare(req)}`;
}

/** Comparte la cotización: menú nativo del celular o copiar enlace, y WhatsApp. */
export function ShareQuote({ request }: { request: QuoteRequest }) {
  const [copied, setCopied] = useState(false);
  const text = `Mira estas opciones de seguro para ${request.vehicle.brand} ${request.vehicle.model} ${request.vehicle.year}`;

  async function share() {
    const url = shareUrl(request);
    if (navigator.share) {
      try {
        await navigator.share({ title: "SeguAlaFija", text, url });
        return;
      } catch {
        /* la persona canceló: se copia el enlace */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copia este enlace", url);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={share}
        className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-brand hover:bg-brand-soft"
      >
        <Share2 className="size-4" aria-hidden />
        <span aria-live="polite">{copied ? "Enlace copiado" : "Compartir"}</span>
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${text}: `)}`}
        onClick={(e) => {
          e.currentTarget.href = `https://wa.me/?text=${encodeURIComponent(`${text}: ${shareUrl(request)}`)}`;
        }}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartir por WhatsApp"
        className="inline-flex size-11 items-center justify-center rounded-full text-mint hover:bg-mint-soft"
      >
        <MessageCircle className="size-5" aria-hidden />
      </a>
    </div>
  );
}
