"use client";

import { useEffect, useState } from "react";
import { Gift, X } from "lucide-react";
import { DEFAULT_DISCOUNT_RULES } from "@/domain/discounts";
import { formatCOP } from "@/domain/labels";
import { track } from "@/lib/analytics";
import { captureReferral } from "@/lib/referral";

const rule = DEFAULT_DISCOUNT_RULES.find((r) => r.requires === "invitacion");

/** Guarda el código de invitación (?ref=) y avisa del descuento una vez. */
export function ReferralCapture() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const code = captureReferral();
    if (code) {
      track("referido_llego");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- aviso de una sola vez tras leer la URL
      setShow(true);
    }
  }, []);
  if (!show) return null;
  return (
    <div role="status" className="flex items-center gap-3 bg-mint-soft px-4 py-2 text-sm text-ink">
      <Gift className="size-5 shrink-0 text-mint" aria-hidden />
      <p className="flex-1">
        Te invitaron a SeguAlaFija: tienes {rule && rule.kind === "valor" ? `${formatCOP(rule.magnitude)} de descuento` : "un descuento"} en tu primer seguro. Se aplica solo al cotizar.
      </p>
      <button type="button" onClick={() => setShow(false)} className="flex size-11 items-center justify-center rounded-full hover:bg-surface" aria-label="Cerrar aviso">
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
