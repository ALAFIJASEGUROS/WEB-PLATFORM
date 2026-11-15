import { z } from "zod";
import { quoteRequestSchema } from "@/domain/schemas";
import { choosePlan } from "@/server/companies";
import { companyErrorResponse, employeeContext } from "@/server/company-api";

const schema = z.object({ quote: quoteRequestSchema, offerId: z.string().min(3).max(60) });

/** El empleado elige su plan; el precio final se confirma al cierre del periodo. */
export async function POST(request: Request, ctx: RouteContext<"/api/empresas/[slug]/eleccion">) {
  const { slug } = await ctx.params;
  const emp = await employeeContext(slug);
  if ("error" in emp) return emp.error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  try {
    const selection = await choosePlan(emp.company, emp.membership, parsed.data.quote, parsed.data.offerId);
    return Response.json({ ok: true, planName: selection.planName, estimatedPremium: selection.estimatedPremium });
  } catch (e) {
    return companyErrorResponse(e);
  }
}
