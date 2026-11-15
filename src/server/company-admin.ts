import "server-only";
import type { CompanyRole } from "@/domain/companies";
import { getCurrentUser } from "./auth";
import { companyRole, findCompanyBySlug } from "./companies";

/** Admin de la empresa con sesión y el rol pedido, o null. "lectura" acepta ambos roles. */
export async function companyAdminSession(slug: string, need: CompanyRole = "lectura") {
  const company = findCompanyBySlug(slug);
  if (!company) return null;
  const user = await getCurrentUser();
  const role = companyRole(company, user);
  if (!user || !role || (need === "admin" && role !== "admin")) return null;
  return { company, user, role };
}
