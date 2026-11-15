import "server-only";
import { getCurrentUser } from "./auth";
import { CompanyError, findCompanyBySlug, membershipFor } from "./companies";

/** Empleado con sesión y vinculación a la empresa del portal, o la respuesta de error. */
export async function employeeContext(slug: string) {
  const company = findCompanyBySlug(slug);
  if (!company) return { error: Response.json({ error: "La empresa no existe." }, { status: 404 }) } as const;
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ error: "Entra con tu correo para cotizar con tu empresa." }, { status: 401 }) } as const;
  const membership = membershipFor(company.id, user);
  if (!membership) return { error: Response.json({ error: "Primero vincúlate a tu empresa." }, { status: 403 }) } as const;
  return { company, user, membership } as const;
}

export function companyErrorResponse(e: unknown) {
  if (e instanceof CompanyError) return Response.json({ error: e.message }, { status: 409 });
  throw e;
}
