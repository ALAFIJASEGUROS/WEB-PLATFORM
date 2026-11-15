import { payrollRows } from "@/domain/companies";
import { todayInColombia } from "@/domain/holidays";
import { toCsv } from "@/lib/csv";
import { companyAudit, membersOf } from "@/server/companies";
import { companyAdminSession } from "@/server/company-admin";

const COLUMNS = [
  { key: "name", label: "Nombre" },
  { key: "email", label: "Correo" },
  { key: "plan", label: "Plan" },
  { key: "vehicle", label: "Vehículo" },
  { key: "annual", label: "Prima anual estimada (COP)" },
  { key: "companyPart", label: "Paga la empresa (COP)" },
  { key: "employeePart", label: "Paga el empleado (COP)" },
  { key: "employeeMonthly", label: "Descuento mensual por nómina (COP)" },
];

/** Reporte para nómina: empleados aprobados con plan elegido. Lo ven ambos roles. */
export async function GET(_req: Request, ctx: RouteContext<"/api/empresas/[slug]/reporte">) {
  const { slug } = await ctx.params;
  const s = await companyAdminSession(slug);
  if (!s) return new Response("No autorizado", { status: 401 });
  const csv = toCsv(payrollRows(s.company, membersOf(s.company.id)), COLUMNS);
  companyAudit(s.company.id, s.user.email, "Descargó el reporte para nómina");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="nomina-${s.company.slug}-${todayInColombia()}.csv"`,
      "cache-control": "no-store",
    },
  });
}
