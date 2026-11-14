import { Badge, Card } from "@/components/ui";
import type { InsurerHealthRow } from "@/insurers/resilience";

const pct = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.01 ? 1 : 0)} %`;
const ttl = (min: number) => (min >= 48 * 60 ? `${Math.round(min / 1440)} días` : `${Math.round(min / 60)} h`);
const ms = (n?: number) => (n === undefined ? "—" : `${n} ms`);
const when = (iso?: string) => (iso ? `${iso.slice(0, 16).replace("T", " ")} UTC` : "—");
const BREAKER = {
  cerrado: { tone: "mint", label: "Circuito cerrado" },
  semiabierto: { tone: "sun", label: "Circuito en prueba" },
  abierto: { tone: "coral", label: "Circuito abierto" },
} as const;

export function InsurerHealthView({ rows }: { rows: InsurerHealthRow[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
      {rows.map((r) => {
        const m = r.metrics;
        const b = BREAKER[m.breaker];
        return (
          <Card key={r.id} className="space-y-3 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="mr-auto font-bold text-heading">{r.name}</h3>
              <Badge tone={r.simulated ? "neutral" : "brand"}>{r.simulated ? "Simulada" : "API real"}</Badge>
              <Badge tone={b.tone}>{b.label}</Badge>
            </div>
            {r.probe && (
              <p className={r.probe.ok ? "text-mint" : "font-semibold text-coral-ink"}>
                {r.probe.ok ? "Conexión OK" : "Sin conexión"} · {ms(r.probe.latencyMs)}
                {r.probe.detail && <span className="text-muted"> · {r.probe.detail}</span>}
              </p>
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              {([
                ["Llamadas", m.calls],
                ["Latencia p50", ms(m.p50Ms)],
                ["Latencia p95", ms(m.p95Ms)],
                ["Errores", pct(m.errorRate)],
                ["Timeouts", pct(m.timeoutRate)],
                ["Rechazos", pct(m.rejectionRate)],
              ] as const).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-semibold tabular-nums text-heading">{v}</dd>
                </div>
              ))}
            </dl>
            {m.lastError && (
              <p className="break-words text-muted">
                Último error ({when(m.lastErrorAt)}): <span className="text-heading">{m.lastError}</span>
              </p>
            )}
            <p className="text-xs text-muted">
              Contrato v{r.contractVersion}
              {!r.contractOk && <span className="font-semibold text-coral-ink"> (incompatible)</span>} · Cotización válida{" "}
              {ttl(r.capabilities.quoteTtlMinutes)} · Emisión {r.capabilities.asyncIssue ? "asíncrona" : "inmediata"}
              {r.capabilities.requiresInspection && " · Puede pedir inspección"}
            </p>
          </Card>
        );
      })}
      <p className="text-xs text-muted md:col-span-2">
        Las métricas son de esta instancia del servidor desde su último arranque.
      </p>
    </div>
  );
}
