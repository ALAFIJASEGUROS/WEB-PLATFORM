import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { daysUntil, userReminders } from "@/server/queries";
import { Badge, Card, Field, inputClass } from "@/components/ui";
import { ActionForm } from "@/components/account/ActionForm";
import { addReminderAction, deleteReminderAction } from "../actions";

const KIND_LABEL = {
  poliza: "Póliza",
  soat: "SOAT",
  tecnomecanica: "Tecnomecánica",
  cuota: "Cuota",
  otro: "Otro",
} as const;

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/cuenta");
  const reminders = userReminders(user.id);
  const pref = user.preferences.vencimientos;
  const channels = [pref.email && "correo", pref.whatsapp && user.phone && "WhatsApp"].filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-heading">Recordatorios</h1>
        <p className="mt-1 text-sm text-muted">
          Te avisamos por {channels.length ? channels.join(" y ") : "ningún canal (actívalos en tu perfil, sección Avisos)"} antes de cada fecha.
          Los de pólizas, SOAT y tecnomecánica se crean solos.
        </p>
      </div>

      <Card className="divide-y divide-line">
        {reminders.length === 0 && <p className="p-5 text-sm text-muted">No tienes recordatorios todavía.</p>}
        {reminders.map((r) => {
          const d = daysUntil(r.dueDate);
          return (
            <div key={r.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{KIND_LABEL[r.kind]}</Badge>
                  {r.auto && <Badge tone="neutral">Automático</Badge>}
                </div>
                <p className="font-semibold text-heading">{r.title}</p>
                <p className="text-sm text-muted">
                  {r.dueDate} · {d < 0 ? `venció hace ${-d} días` : d === 0 ? "hoy" : `en ${d} días`} · aviso {r.daysBefore} días antes
                </p>
              </div>
              <form action={deleteReminderAction.bind(null, r.id)}>
                <button aria-label={`Eliminar recordatorio ${r.title}`} className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-coral-soft hover:text-coral">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </form>
            </div>
          );
        })}
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-bold text-heading">Nuevo recordatorio</h2>
        <ActionForm action={addReminderAction} submitLabel="Agregar" className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="¿Qué te recordamos?" htmlFor="r-title">
              <input id="r-title" name="title" required placeholder="Pagar impuesto vehicular" className={inputClass} />
            </Field>
          </div>
          <Field label="Tipo" htmlFor="r-kind">
            <select id="r-kind" name="kind" className={inputClass} defaultValue="otro">
              {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="Fecha" htmlFor="r-date">
            <input id="r-date" name="dueDate" type="date" required className={inputClass} />
          </Field>
          <Field label="Avisarme con anticipación" htmlFor="r-days">
            <select id="r-days" name="daysBefore" className={inputClass} defaultValue="7">
              {[1, 3, 7, 15, 30].map((n) => <option key={n} value={n}>{n} {n === 1 ? "día" : "días"} antes</option>)}
            </select>
          </Field>
        </ActionForm>
      </Card>
    </div>
  );
}
