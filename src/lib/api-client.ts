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

export type CheckoutStart =
  | { redirectUrl: string; acceptance?: undefined }
  | { acceptance: true; reference: string; token: string; demoCode?: string };

/**
 * Crea la orden. En la versión completa devuelve los datos para aceptar con
 * código; en la demo estática va directo a la pasarela simulada.
 */
export async function startCheckout(input: CheckoutInput): Promise<CheckoutStart> {
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

/** Confirma la aceptación con el código y devuelve la URL de pago. */
export async function confirmAcceptance(reference: string, token: string, code: string): Promise<{ redirectUrl: string }> {
  return json(
    await fetch("/api/ordenes/aceptar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reference, token, code }),
    }),
  );
}
