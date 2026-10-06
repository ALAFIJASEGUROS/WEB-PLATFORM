import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { ActionForm } from "@/components/account/ActionForm";
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
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-semibold text-heading">¿Por dónde te avisamos?</legend>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="ch_email" defaultChecked={user.channels.email} className="size-5 accent-brand" />Correo electrónico</label>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="ch_whatsapp" defaultChecked={user.channels.whatsapp} className="size-5 accent-brand" />WhatsApp</label>
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
      <form action={logoutAction}>
        <Button type="submit" variant="secondary">Cerrar sesión</Button>
      </form>
    </div>
  );
}
