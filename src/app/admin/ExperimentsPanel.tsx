import { experimentResults, MIN_SAMPLE } from "@/server/analytics";
import { experiments } from "@/server/experiments";
import { ALGORITHM_VERSION } from "@/recommendation/scoring";
import { Badge, Button, Card } from "@/components/ui";
import { toggleExperimentAction } from "./actions";

const pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);

export function ExperimentsPanel({ canEdit }: { canEdit: boolean }) {
  return (
    <section className="space-y-3" aria-labelledby="experimentos">
      <h2 id="experimentos" className="text-lg font-bold text-heading">Experimentos del recomendador</h2>
      <p className="text-sm text-muted">
        Cada sesión cae siempre en la misma variante. El experimento solo cambia los pesos de una prioridad: no toca la
        elegibilidad, el precio ni a quien ajustó sus propios pesos. Algoritmo {ALGORITHM_VERSION}.
      </p>
      {experiments().map((exp) => {
        const rows = experimentResults(exp);
        const small = rows.some((r) => r.exposed < MIN_SAMPLE);
        return (
          <Card key={exp.id} className="space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-heading">{exp.question}</p>
                <p className="text-xs text-muted">{exp.id}</p>
              </div>
              {canEdit ? (
                <form action={toggleExperimentAction.bind(null, exp.id, !exp.active)}>
                  <Button variant={exp.active ? "secondary" : "primary"} className="min-h-10 px-4 text-sm">{exp.active ? "Detener" : "Iniciar"}</Button>
                </form>
              ) : (
                <Badge tone={exp.active ? "mint" : "neutral"}>{exp.active ? "Activo" : "Detenido"}</Badge>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="text-left text-muted">
                    <th scope="col" className="py-2 font-medium">Variante</th>
                    <th scope="col" className="py-2 text-right font-medium">Sesiones</th>
                    <th scope="col" className="py-2 text-right font-medium">Eligió la recomendada</th>
                    <th scope="col" className="py-2 text-right font-medium">Fue a pagar</th>
                    <th scope="col" className="py-2 text-right font-medium">Compró</th>
                    <th scope="col" className="py-2 text-right font-medium">Conversión</th>
                    <th scope="col" className="py-2 text-right font-medium">Valor p</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.variantId} className="border-t border-line">
                      <th scope="row" className="py-2 pr-3 text-left font-normal">
                        <span className="font-semibold text-ink">{r.variantId}</span>
                        {i === 0 && <span className="text-muted"> (control)</span>}
                        <span className="block text-xs text-muted">{r.label}</span>
                      </th>
                      <td className="py-2 text-right">{r.exposed}</td>
                      <td className="py-2 text-right">{r.exposed ? pct(r.choseRecommended / r.exposed) : "—"}</td>
                      <td className="py-2 text-right">{r.checkout}</td>
                      <td className="py-2 text-right">{r.paid}</td>
                      <td className="py-2 text-right font-semibold">{pct(r.conversion)}</td>
                      <td className="py-2 text-right">{r.pValue === null ? "—" : r.pValue.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">
              {small
                ? `Aún no hay datos suficientes: espera al menos ${MIN_SAMPLE} sesiones por variante antes de concluir.`
                : "Un valor p menor a 0,05 sugiere que la diferencia en compras no es casualidad."}
            </p>
          </Card>
        );
      })}
    </section>
  );
}
