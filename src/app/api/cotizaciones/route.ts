import { quoteRequestSchema } from "@/domain/schemas";
import { quoteWithCache } from "@/insurers/cache";
import { buildQuoteResponse } from "@/recommendation/scoring";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Solicitud inválida", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { offers, errors } = await quoteWithCache(parsed.data);
  return Response.json(buildQuoteResponse(offers, errors, parsed.data.answers));
}
