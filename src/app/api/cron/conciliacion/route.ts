import { reconcilePayments } from "@/server/reconciliation";

// Conciliación diaria (cron de Vercel, ver vercel.json).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const report = await reconcilePayments();
  return Response.json({ checked: report.checked, updated: report.updated, issues: report.issues.length });
}
