"use client";

import { useEffect } from "react";

export const SESSION_EVENT = "saf:session";

/**
 * Avisa al header cuando cambia la sesión (inicio de sesión o nombre editado)
 * sin que cambie la ruta. Se monta en las páginas de la cuenta.
 */
export function SessionSync({ name, email }: { name: string | null; email: string }) {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: { name, email } }));
  }, [name, email]);
  return null;
}
