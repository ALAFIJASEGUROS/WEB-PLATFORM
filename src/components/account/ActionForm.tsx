"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import type { FormState } from "@/app/cuenta/actions";
import { Button } from "@/components/ui";

/** Formulario genérico para server actions con mensajes de error/éxito. */
export function ActionForm({
  action,
  children,
  submitLabel,
  successMessage = "Guardado.",
  resetOnSuccess = true,
  className = "space-y-4",
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: ReactNode;
  submitLabel: string;
  successMessage?: string;
  resetOnSuccess?: boolean;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state.error && <p role="alert" className="text-sm font-medium text-coral">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm font-medium text-mint">{successMessage}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}
