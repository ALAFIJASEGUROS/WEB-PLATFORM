import { reconcilePayments } from "@/server/reconciliation";
import { closeDueEnrollments } from "@/server/companies";

// Conciliación diaria y cierre de inscripciones del beneficio para empleados
// cuya fecha ya llegó (cron de Vercel, ver vercel.json).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const report = await reconcilePayments();
  const enrollments = await closeDueEnrollments();
  return Response.json({ checked: report.checked, updated: report.updated, issues: report.issues.length, enrollmentsClosed: enrollments.closed });
}
