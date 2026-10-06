import { dispatchDueReminders } from "@/server/reminders";

// Lo invoca el cron de Vercel (ver vercel.json). Vercel envía
// "Authorization: Bearer <CRON_SECRET>" cuando CRON_SECRET está configurado.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  return Response.json(dispatchDueReminders());
}
