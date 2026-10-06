"use client";

import type { CheckoutInput } from "@/domain/schemas";
import type { QuoteRequest, QuoteResponse, Vehicle } from "@/domain/types";

/**
 * En la demo estática (GitHub Pages) no hay servidor: la cotización y la
 * compra se simulan en el navegador con la misma lógica de dominio.
 */
export const STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body as T;
}

export async function fetchQuote(req: QuoteRequest): Promise<QuoteResponse> {
  if (STATIC_DEMO) {
    const [{ quoteAll }, { scoreOffers }] = await Promise.all([
      import("@/insurers/aggregator"),
      import("@/recommendation/scoring"),
    ]);
    const { offers, errors } = await quoteAll(req);
    return { quoteId: crypto.randomUUID(), offers: scoreOffers(offers, req.answers), errors };
  }
  return json(
    await fetch("/api/cotizaciones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
    }),
  );
}

export async function lookupVehicle(plate: string): Promise<Vehicle> {
  if (STATIC_DEMO) {
    const { lookupPlate } = await import("@/vehicles/lookup");
    const v = lookupPlate(plate);
    if (!v) throw new Error("Placa no válida.");
    return v;
  }
  return json(await fetch(`/api/vehiculos/${plate}`));
}

/** Devuelve la URL a la que hay que llevar al usuario para pagar. */
export async function startCheckout(input: CheckoutInput): Promise<{ redirectUrl: string }> {
  if (STATIC_DEMO) {
    const { createDemoOrder } = await import("./demo-store");
    const order = createDemoOrder(input);
    if (!order) throw new Error("La oferta ya no está disponible. Cotiza de nuevo.");
    return { redirectUrl: `/pago/simulado?ref=${order.reference}` };
  }
  return json(
    await fetch("/api/ordenes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}
