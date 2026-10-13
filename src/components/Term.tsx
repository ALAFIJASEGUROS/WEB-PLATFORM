"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { GLOSSARY, type GlossaryKey } from "@/domain/glossary";

/**
 * Término con explicación emergente: se abre con clic o Enter, se cierra con
 * Esc o al tocar fuera. El texto también está en /glosario.
 */
export function Term({ id, children, align = "left" }: { id: GlossaryKey; children?: ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const panelId = useId();
  const entry = GLOSSARY[id];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="cursor-help underline decoration-dotted decoration-2 underline-offset-4 hover:text-brand"
      >
        {children ?? entry.term}
      </button>
      {open && (
        <span
          id={panelId}
          role="note"
          className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full z-30 mt-2 block w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-surface p-3 text-left text-sm font-normal normal-case tracking-normal text-ink shadow-lg`}
        >
          <strong className="block text-heading">{entry.term}</strong>
          {entry.text}
        </span>
      )}
    </span>
  );
}
