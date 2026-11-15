"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { QuoteRequest } from "@/domain/types";
import { fetchQuote } from "@/lib/api-client";
import { quoteStore } from "@/lib/quote-store";
import { Button } from "@/components/ui";

/**
 * Al cierre de la inscripción: carga la cotización del plan elegido con la
 * tarifa fijada y abre el checkout del beneficio.
 */
export function ConfirmBenefitButton({ slug, quote, offerId, label }: { slug: string; quote: QuoteRequest; offerId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      quoteStore.setCompany({ slug });
      quoteStore.setRequest(quote);
      const res = await fetchQuote(quote, slug);
      if (!res.offers.some((o) => o.id === offerId)) throw new Error("Tu plan ya no está disponible. Elige otro.");
      quoteStore.setResponse(res);
      router.push(`/checkout?oferta=${encodeURIComponent(offerId)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos cargar tu plan. Intenta de nuevo.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={go} disabled={busy}>{busy ? "Cargando…" : label}</Button>
      {error && <p role="alert" className="text-sm font-medium text-coral-ink">{error}</p>}
    </div>
  );
}
