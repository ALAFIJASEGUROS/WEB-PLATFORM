import { quoteRequestSchema } from "@/domain/schemas";
import type { QuoteResponse } from "@/domain/types";
import { quoteAll } from "@/insurers/aggregator";
import { scoreOffers } from "@/recommendation/scoring";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Solicitud inválida", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { offers, errors } = await quoteAll(parsed.data);
  const response: QuoteResponse = {
    quoteId: crypto.randomUUID(),
    offers: scoreOffers(offers, parsed.data.answers),
    errors,
  };
  return Response.json(response);
}
