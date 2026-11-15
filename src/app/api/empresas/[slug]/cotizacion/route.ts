import { quoteRequestSchema } from "@/domain/schemas";
import { buildQuoteResponse } from "@/recommendation/scoring";
import { quoteAsEmployee } from "@/server/companies";
import { companyErrorResponse, employeeContext } from "@/server/company-api";

/** Cotización con tarifa corporativa para un empleado vinculado. */
export async function POST(request: Request, ctx: RouteContext<"/api/empresas/[slug]/cotizacion">) {
  const { slug } = await ctx.params;
  const emp = await employeeContext(slug);
  if ("error" in emp) return emp.error;
  const parsed = quoteRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  try {
    const { offers, errors, context } = await quoteAsEmployee(emp.company, emp.membership, parsed.data);
    return Response.json({ ...buildQuoteResponse(offers, errors, parsed.data.answers, null, parsed.data.vehicle), company: context });
  } catch (e) {
    return companyErrorResponse(e);
  }
}
