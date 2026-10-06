"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { formatCOP } from "@/domain/labels";

export function SimulatedCheckout({
  reference,
  token,
  amount,
  description,
}: {
  reference: string;
  token: string;
  amount: number;
  description: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function pay(outcome: "APPROVED" | "DECLINED" | "PENDING") {
    setBusy(true);
    await fetch("/api/pagos/simulado", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reference, token, outcome }),
    });
    router.push(`/pago/resultado?ref=${encodeURIComponent(reference)}&t=${token}`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Card className="space-y-5 p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Pasarela simulada</p>
          <h1 className="mt-1 text-2xl font-extrabold text-heading">{formatCOP(amount)}</h1>
          <p className="text-sm text-muted">{description}</p>
          <p className="mt-1 text-xs text-muted">Referencia {reference}</p>
        </div>
        <p className="rounded-xl bg-sun-soft p-3 text-sm text-sun-ink">
          Configura WOMPI_PUBLIC_KEY, WOMPI_INTEGRITY_SECRET y WOMPI_EVENTS_SECRET para usar el checkout real de Wompi (sandbox).
        </p>
        <div className="grid gap-2">
          <Button disabled={busy} onClick={() => pay("APPROVED")}>Simular pago aprobado</Button>
          <Button disabled={busy} variant="secondary" onClick={() => pay("PENDING")}>Simular pago pendiente (PSE)</Button>
          <Button disabled={busy} variant="ghost" onClick={() => pay("DECLINED")}>Simular pago rechazado</Button>
        </div>
      </Card>
    </div>
  );
}
