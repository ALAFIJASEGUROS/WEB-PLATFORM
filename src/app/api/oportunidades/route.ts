import { firstIssue, leadInputSchema } from "@/domain/leads";
import { requestContext } from "@/server/auth";
import { createLead } from "@/server/leads";

const MAX_BODY_BYTES = 16_384;

/** "Que me llamen" desde resultados y solicitudes de propuesta para flotas. */
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return Response.json({ error: "Solicitud demasiado grande." }, { status: 413 });
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    /* cuerpo inválido */
  }
  const parsed = leadInputSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const lead = createLead(parsed.data, await requestContext());
  return Response.json({ id: lead.id }, { status: 201 });
}
