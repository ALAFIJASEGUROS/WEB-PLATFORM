import { quoteRequestSchema } from "@/domain/schemas";
import { quoteWithCache } from "@/insurers/cache";
import { buildQuoteResponse } from "@/recommendation/scoring";
import { withDiscounts } from "@/server/discounts";
import { assignmentForSession } from "@/server/experiments";

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
  // La sesión anónima de analítica decide la variante del experimento A/B de pesos.
  const sid = request.headers.get("x-saf-sid")?.slice(0, 64) || undefined;
  return Response.json(buildQuoteResponse(withDiscounts(offers), errors, parsed.data.answers, assignmentForSession(sid)));
}
