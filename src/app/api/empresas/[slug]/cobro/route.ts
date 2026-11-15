import { todayInColombia } from "@/domain/holidays";
import { toCsv } from "@/lib/csv";
import { companyAudit, companyChargeRows } from "@/server/companies";
import { companyAdminSession } from "@/server/company-admin";

const CHANNEL = { wompi: "Pago en línea", nomina: "Descuento por nómina", empresa: "Paga la empresa" } as const;
const COLUMNS = [
  { key: "reference", label: "Referencia" },
  { key: "date", label: "Fecha" },
  { key: "name", label: "Empleado" },
  { key: "email", label: "Correo" },
  { key: "plan", label: "Plan" },
  { key: "annual", label: "Prima anual (COP)" },
  { key: "companyPart", label: "Cobro a la empresa (COP)" },
  { key: "employeePart", label: "Parte del empleado (COP)" },
  { key: "channel", label: "Pago del empleado" },
];

/** Cobro a la empresa: su parte de cada póliza confirmada. */
export async function GET(_req: Request, ctx: RouteContext<"/api/empresas/[slug]/cobro">) {
  const { slug } = await ctx.params;
  const s = await companyAdminSession(slug);
  if (!s) return new Response("No autorizado", { status: 401 });
  const rows = companyChargeRows(s.company).map((r) => ({ ...r, channel: CHANNEL[r.channel] }));
  companyAudit(s.company.id, s.user.email, "Descargó el cobro a la empresa");
  return new Response(toCsv(rows, COLUMNS), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="cobro-${s.company.slug}-${todayInColombia()}.csv"`,
      "cache-control": "no-store",
    },
  });
}
