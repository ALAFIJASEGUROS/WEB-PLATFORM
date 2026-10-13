import type { AdminSnapshot } from "@/domain/admin";
import { ALGORITHM_VERSION } from "@/recommendation/scoring";
import { Button } from "@/components/ui";
import { ExperimentCard, SectionTitle } from "@/components/admin/AdminViews";
import { toggleExperimentAction } from "./actions";

export function ExperimentsPanel({ canEdit, experiments }: { canEdit: boolean; experiments: AdminSnapshot["experiments"] }) {
  return (
    <section className="space-y-3" aria-labelledby="experimentos">
      <SectionTitle id="experimentos">Experimentos A/B</SectionTitle>
      <p className="text-sm text-muted">
        Cada sesión cae siempre en la misma variante. Los de pesos solo cambian el orden de las ofertas (no la elegibilidad,
        el precio ni a quien ajustó sus pesos) y se inician o detienen aquí. Los de interfaz prueban textos y diseño de los
        llamados a la acción y se activan en el código. Algoritmo {ALGORITHM_VERSION}.
      </p>
      {experiments.map((exp) => (
        <ExperimentCard
          key={exp.id}
          exp={exp}
          action={
            canEdit && exp.kind === "pesos" ? (
              <form action={toggleExperimentAction.bind(null, exp.id, !exp.active)}>
                <Button variant={exp.active ? "secondary" : "primary"} className="min-h-10 px-4 text-sm">{exp.active ? "Detener" : "Iniciar"}</Button>
              </form>
            ) : undefined
          }
        />
      ))}
    </section>
  );
}
