"use client";

import type { CheckoutInput } from "@/domain/schemas";
import type { QuoteRequest, QuoteResponse, Vehicle } from "@/domain/types";

/**
 * En la demo estática (GitHub Pages) no hay servidor: la cotización y la
 * compra se simulan en el navegador con la misma lógica de dominio.
 */
export const STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";

/** Error de la API con el cuerpo de la respuesta (p. ej. `priceChanged`). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly body: Record<string, unknown>,
  ) {
    super(message);
  }
}

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? `HTTP ${res.status}`, body);
  return body as T;
}

/** Si la orden se rechazó porque el precio cambió, devuelve el precio nuevo. */
export function changedPrice(err: unknown): number | undefined {
  const p = err instanceof ApiError ? (err.body.priceChanged as { current?: unknown } | undefined) : undefined;
  return typeof p?.current === "number" ? p.current : undefined;
}

export async function fetchQuote(req: QuoteRequest): Promise<QuoteResponse> {
  if (STATIC_DEMO) {
    const [{ quoteAll }, { buildQuoteResponse }, d] = await Promise.all([
      import("@/insurers/aggregator"),
      import("@/recommendation/scoring"),
      import("@/domain/discounts"),
    ]);
    const { offers, errors } = await quoteAll(req);
    const discounted = d.applyDiscountsToAll(offers, d.DEFAULT_DISCOUNT_RULES, d.DEFAULT_DISCOUNT_SETTINGS);
    return buildQuoteResponse(discounted, errors, req.answers, null, req.vehicle);
  }
  const { analyticsSessionId } = await import("./analytics");
  const sid = analyticsSessionId();
  return json(
    await fetch("/api/cotizaciones", {
      method: "POST",
      headers: { "content-type": "application/json", ...(sid && { "x-saf-sid": sid }) },
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

/** Guarda en el navegador lo que en la demo estática iría al servidor. */
function demoAppend(key: string, item: unknown) {
  try {
    const list = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown[];
    localStorage.setItem(key, JSON.stringify([item, ...list].slice(0, 20)));
  } catch {
    /* almacenamiento no disponible */
  }
}

/** "Que me llamen" o solicitud de propuesta para una flota. */
export async function requestCall(input: import("@/domain/leads").LeadInput): Promise<void> {
  if (STATIC_DEMO) {
    const { leadInputSchema, firstIssue } = await import("@/domain/leads");
    const parsed = leadInputSchema.safeParse(input);
    if (!parsed.success) throw new Error(firstIssue(parsed.error));
    demoAppend("saf:demo-leads", { ...parsed.data, createdAt: new Date().toISOString() });
    return;
  }
  await json(await fetch("/api/oportunidades", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }));
}

/** Envía la cotización al correo. En la demo estática devuelve el enlace para copiarlo. */
export async function saveQuoteByEmail(input: { email: string; consent: boolean; request: QuoteRequest; best?: string }): Promise<{ link?: string }> {
  if (STATIC_DEMO) {
    const [{ savedQuoteInputSchema, firstIssue }, { encodeShare }] = await Promise.all([import("@/domain/leads"), import("./share")]);
    const parsed = savedQuoteInputSchema.safeParse(input);
    if (!parsed.success) throw new Error(firstIssue(parsed.error));
    const link = `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/resultados?c=${encodeShare(input.request)}`;
    demoAppend("saf:demo-saved-quotes", { email: input.email, link, createdAt: new Date().toISOString() });
    return { link };
  }
  await json(await fetch("/api/cotizaciones/guardar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }));
  return {};
}
