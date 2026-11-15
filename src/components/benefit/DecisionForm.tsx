"use client";

import { useActionState, useState } from "react";
import { Button, inputClass } from "@/components/ui";
/** Mismo formato que el estado de los server actions de la app (`FormState`). */
type FormState = { ok?: boolean; error?: string; message?: string };

export interface PendingRow {
  id: string;
  name?: string;
  email: string;
  source: string;
  plan?: string;
}

const SOURCE_LABEL: Record<string, string> = { dominio: "Correo de la empresa", codigo: "Código", csv: "Invitación" };

/** Bandeja de vinculaciones pendientes: aprobar o rechazar una o varias. */
export function DecisionForm({ rows, action }: { rows: PendingRow[]; action: (s: FormState, f: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [picked, setChecked] = useState<Set<string>>(new Set());
  // Tras guardar, las filas decididas desaparecen: solo cuentan las que siguen en la lista.
  const checked = new Set(rows.map((r) => r.id).filter((id) => picked.has(id)));
  const all = rows.length > 0 && checked.size === rows.length;
  const toggle = (id: string) =>
    setChecked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (rows.length === 0)
    return (
      <div className="space-y-1 p-4 text-sm">
        {state.ok && <p role="status" className="font-medium text-mint">{state.message}</p>}
        <p className="text-muted">No hay vinculaciones pendientes.</p>
      </div>
    );

  return (
    <form action={formAction} className="divide-y divide-line">
      <label className="flex min-h-11 items-center gap-3 px-4 text-sm font-semibold text-heading">
        <input
          type="checkbox"
          checked={all}
          onChange={() => setChecked(all ? new Set() : new Set(rows.map((r) => r.id)))}
          className="size-5 accent-brand"
        />
        Seleccionar todas ({rows.length})
      </label>
      {rows.map((r) => (
        <label key={r.id} className="flex items-start gap-3 px-4 py-3 text-sm">
          <input type="checkbox" name="ids" value={r.id} checked={checked.has(r.id)} onChange={() => toggle(r.id)} className="mt-0.5 size-5 shrink-0 accent-brand" />
          <span className="min-w-0">
            <span className="block font-semibold text-heading">{r.name ?? r.email}</span>
            <span className="block break-words text-muted">
              {r.name && `${r.email} · `}
              {SOURCE_LABEL[r.source] ?? r.source}
              {r.plan && ` · eligió ${r.plan}`}
            </span>
          </span>
        </label>
      ))}
      <div className="space-y-3 p-4">
        <input name="reason" maxLength={200} placeholder="Motivo del rechazo (opcional, lo ve el empleado)" aria-label="Motivo del rechazo" className={inputClass} />
        {state.error && <p role="alert" className="text-sm font-medium text-coral-ink">{state.error}</p>}
        {state.ok && <p role="status" className="text-sm font-medium text-mint">{state.message}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" name="decision" value="aprobar" disabled={pending || checked.size === 0}>
            Aprobar {checked.size > 0 ? `(${checked.size})` : ""}
          </Button>
          <Button type="submit" name="decision" value="rechazar" variant="secondary" disabled={pending || checked.size === 0}>
            Rechazar {checked.size > 0 ? `(${checked.size})` : ""}
          </Button>
        </div>
      </div>
    </form>
  );
}
