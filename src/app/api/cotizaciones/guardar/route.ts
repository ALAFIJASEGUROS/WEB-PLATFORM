import { z } from "zod";
import { firstIssue, savedQuoteInputSchema } from "@/domain/leads";
import { quoteRequestSchema } from "@/domain/schemas";
import type { QuoteRequest } from "@/domain/types";
import { baseUrl, requestContext } from "@/server/auth";
import { saveQuote } from "@/server/leads";

const schema = savedQuoteInputSchema.extend({ request: quoteRequestSchema, best: z.string().max(120).optional() });

/** Envía la cotización al correo para retomarla después (con un recordatorio). */
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 16_384) return Response.json({ error: "Solicitud demasiado grande." }, { status: 413 });
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    /* cuerpo inválido */
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const { email, request: quote, best } = parsed.data;
  saveQuote(email, quote as QuoteRequest, await baseUrl(), best, await requestContext());
  return Response.json({ ok: true }, { status: 201 });
}
