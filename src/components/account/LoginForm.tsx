"use client";

import { useActionState } from "react";
import { requestCodeAction, verifyCodeAction, type FormState } from "@/app/cuenta/actions";
import { Button, Card, Field, inputClass } from "@/components/ui";

export function LoginForm({ defaultEmail = "", next = "/cuenta" }: { defaultEmail?: string; next?: string }) {
  const [sent, request, requesting] = useActionState<FormState, FormData>(requestCodeAction, {});
  const [verify, check, checking] = useActionState<FormState, FormData>(verifyCodeAction, {});
  const email = verify.email ?? sent.email;

  return (
    <Card className="mx-auto max-w-md space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-heading">Entra a tu cuenta</h1>
        <p className="mt-1 text-sm text-muted">
          Sin contraseñas: te enviamos un código a tu correo. Si compraste sin cuenta, usa el mismo
          correo y verás tus pólizas.
        </p>
      </div>

      {!sent.ok ? (
        <form action={request} className="space-y-4">
          <Field label="Correo electrónico" htmlFor="email" error={sent.error}>
            <input id="email" name="email" type="email" required autoComplete="email" defaultValue={defaultEmail} className={inputClass} />
          </Field>
          <Button type="submit" className="w-full" disabled={requesting}>
            {requesting ? "Enviando…" : "Enviarme el código"}
          </Button>
        </form>
      ) : (
        <form action={check} className="space-y-4">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="next" value={next} />
          <p className="text-sm text-ink">Enviamos un código de 6 dígitos a <strong>{email}</strong>.</p>
          {sent.demoCode && (
            <p className="rounded-xl bg-sun-soft p-3 text-sm text-sun-ink">
              Modo demo (sin envío de correos): tu código es <strong className="tracking-widest">{sent.demoCode}</strong>
            </p>
          )}
          <Field label="Código" htmlFor="code" error={verify.error}>
            <input id="code" name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} className={`${inputClass} text-center text-2xl font-bold tracking-[0.5em]`} />
          </Field>
          <Button type="submit" className="w-full" disabled={checking}>
            {checking ? "Verificando…" : "Entrar"}
          </Button>
        </form>
      )}
    </Card>
  );
}
