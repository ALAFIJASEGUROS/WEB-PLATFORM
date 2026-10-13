"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Panel inferior modal para el celular, sobre <dialog>: atrapa el foco, cierra
 * con Esc y devuelve el foco al botón que lo abrió.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 mt-auto max-h-[85vh] w-full max-w-none rounded-t-3xl md:mx-auto md:max-w-lg bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/40"
    >
      <div className="pb-safe flex max-h-[85vh] flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 id={titleId} className="text-lg font-bold text-heading">{title}</h2>
          <button type="button" onClick={onClose} className="flex size-11 items-center justify-center rounded-full hover:bg-canvas" aria-label="Cerrar">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </dialog>
  );
}
