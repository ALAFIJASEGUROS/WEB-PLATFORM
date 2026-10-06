import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { ActionForm } from "@/components/account/ActionForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CHANNEL_LABELS, CHANNELS, MESSAGE_TYPE_KEYS, MESSAGE_TYPES } from "@/domain/messaging";
import { logoutAction, updateProfileAction } from "../actions";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/cuenta");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-heading">Perfil y preferencias</h1>
      <Card className="p-5">
        <ActionForm action={updateProfileAction} submitLabel="Guardar cambios" resetOnSuccess={false}>
          <p className="text-sm text-muted">Correo: <strong className="text-ink">{user.email}</strong></p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="p-name">
              <input id="p-name" name="name" defaultValue={user.name} autoComplete="name" className={inputClass} />
            </Field>
            <Field label="Celular" htmlFor="p-phone" hint="Necesario para avisos por WhatsApp.">
              <input id="p-phone" name="phone" type="tel" inputMode="numeric" maxLength={10} defaultValue={user.phone} className={inputClass} />
            </Field>
          </div>
          <fieldset>
            <legend id="avisos" className="mb-2 text-sm font-semibold text-heading">Avisos: qué te enviamos y por dónde</legend>
            <table className="w-full text-sm" aria-labelledby="avisos">
              <thead>
                <tr className="text-left text-muted">
                  <th scope="col" className="py-2 font-medium">Tipo de mensaje</th>
                  {CHANNELS.map((c) => (
                    <th key={c} scope="col" className="w-20 py-2 text-center font-medium">{CHANNEL_LABELS[c]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MESSAGE_TYPE_KEYS.map((t) => {
                  const info = MESSAGE_TYPES[t];
                  return (
                    <tr key={t} className="border-t border-line align-top">
                      <th scope="row" className="py-3 pr-3 text-left font-normal">
                        <span className="block font-semibold text-ink">{info.label}</span>
                        <span className="block text-xs text-muted">{info.description}</span>
                      </th>
                      {CHANNELS.map((c) => {
                        const locked = (info.mandatory && c === "email") || (c === "whatsapp" && !user.phone);
                        return (
                          <td key={c} className="py-3 text-center">
                            <input
                              type="checkbox"
                              name={`pref_${t}_${c}`}
                              defaultChecked={user.preferences[t][c] || (info.mandatory && c === "email")}
                              disabled={locked}
                              aria-label={`${info.label} por ${CHANNEL_LABELS[c]}`}
                              className="size-5 accent-brand"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!user.phone && <p className="mt-1 text-xs text-muted">Agrega tu celular para recibir avisos por WhatsApp.</p>}
          </fieldset>
          <label className="flex gap-3 text-sm">
            <input type="checkbox" name="marketing" defaultChecked={user.marketingConsent} className="mt-0.5 size-5 shrink-0 accent-brand" />
            <span>Autorizo recibir ofertas e información de aseguradoras y aliados. Los recordatorios de mis seguros no dependen de esta opción.</span>
          </label>
          <p className="text-xs text-muted">
            Solo te contactamos de lunes a viernes de 7:00 a. m. a 7:00 p. m. y sábados de 8:00 a. m. a 3:00 p. m. (Ley 2300 de 2023).
          </p>
        </ActionForm>
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="font-semibold text-heading">Apariencia</p>
        <ThemeToggle />
      </Card>
      <form action={logoutAction}>
        <Button type="submit" variant="secondary">Cerrar sesión</Button>
      </form>
    </div>
  );
}
