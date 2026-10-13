import { EVENT_COLUMNS, LEAD_COLUMNS, leadCsvRows, ORDER_COLUMNS, orderCsvRows, PQR_COLUMNS } from "@/components/admin/exports";
import { toCsv } from "@/lib/csv";
import { adminSession, audit } from "@/server/admin";
import { buildAdminSnapshot } from "@/server/admin-snapshot";
import { allEvents } from "@/server/analytics";
import { todayInColombia } from "@/domain/holidays";

// Exporta a CSV (Excel en español) órdenes, PQR o eventos. Lo pueden usar los
// roles admin y analista; queda en la bitácora porque incluye datos personales.
export async function GET(request: Request) {
  const session = await adminSession();
  if (!session) return new Response("No autorizado", { status: 401 });
  const tipo = new URL(request.url).searchParams.get("tipo");
  const snap = buildAdminSnapshot();
  let csv: string;
  if (tipo === "ordenes") csv = toCsv(orderCsvRows(snap.orders), ORDER_COLUMNS);
  else if (tipo === "pqr") csv = toCsv(snap.pqrs, PQR_COLUMNS);
  else if (tipo === "oportunidades") csv = toCsv(leadCsvRows(snap.leads), LEAD_COLUMNS);
  else if (tipo === "eventos") {
    csv = toCsv(allEvents().map((e) => ({ at: e.at, event: e.event, sid: e.sid, props: JSON.stringify(e.props) })), EVENT_COLUMNS);
  } else {
    return new Response("Tipo no válido: usa ordenes, oportunidades, pqr o eventos", { status: 400 });
  }
  audit(session.email, "Exportó CSV", tipo);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="segualafija-${tipo}-${todayInColombia()}.csv"`,
      "cache-control": "no-store",
    },
  });
}
