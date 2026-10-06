"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { confirmAcceptance } from "@/lib/api-client";
import { Button, Field, inputClass } from "@/components/ui";

/**
 * Paso de aceptación: el tomador escribe el código que llegó a su correo para
 * aceptar las condiciones (firma electrónica simple con evidencia).
 */
export function AcceptanceDialog({
  email,
  reference,
  token,
  demoCode,
  onAccepted,
  onCancel,
}: {
  email: string;
  reference: string;
  token: string;
  demoCode?: string;
  onAccepted: (redirectUrl: string) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { redirectUrl } = await confirmAcceptance(reference, token, code);
      onAccepted(redirectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos verificar el código.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="acceptance-title">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-[var(--radius-card)] bg-surface p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-8 shrink-0 text-mint" aria-hidden />
          <h2 id="acceptance-title" className="text-xl font-extrabold text-heading">Confirma tu compra</h2>
        </div>
        <p className="text-sm text-ink">
          Enviamos un código de 6 dígitos a <strong>{email}</strong>. Al ingresarlo aceptas las condiciones del seguro y
          continúas al pago.
        </p>
        {demoCode && (
          <p className="rounded-xl bg-sun-soft p-3 text-sm text-sun-ink">
            Modo demo (sin envío de correos): tu código es <strong className="tracking-widest">{demoCode}</strong>
          </p>
        )}
        <Field label="Código de aceptación" htmlFor="acceptance-code" error={error ?? undefined}>
          <input
            id="acceptance-code"
            autoFocus
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            aria-invalid={!!error}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className={`${inputClass} text-center text-2xl font-bold tracking-[0.5em]`}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>Volver</Button>
          <Button type="submit" disabled={busy || code.length !== 6}>{busy ? "Verificando…" : "Aceptar y pagar"}</Button>
        </div>
      </form>
    </div>
  );
}
