import { dispatchDueReminders } from "@/server/reminders";
import { sendCloseReminders } from "@/server/companies";

// Lo invoca el cron de Vercel (ver vercel.json). Vercel envía
// "Authorization: Bearer <CRON_SECRET>" cuando CRON_SECRET está configurado.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  // También avisa a los empleados antes del cierre de la inscripción de su empresa.
  return Response.json({ ...(await dispatchDueReminders()), companyReminders: sendCloseReminders().sent });
}
