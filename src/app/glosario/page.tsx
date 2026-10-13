import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { GLOSSARY } from "@/domain/glossary";

export const metadata: Metadata = {
  title: "Glosario de seguros",
  description: "Deducible, responsabilidad civil, SMMLV, pérdida total y otros términos explicados en lenguaje simple.",
};

export default function Page() {
  const entries = Object.entries(GLOSSARY).sort((a, b) => a[1].term.localeCompare(b[1].term, "es"));
  return (
    <ContentPage title="Glosario" intro="Los términos de seguros que verás en SeguAlaFija, explicados en lenguaje simple.">
      <dl className="space-y-4">
        {entries.map(([id, e]) => (
          <div key={id} id={id} className="scroll-mt-24 rounded-2xl bg-surface p-4 shadow-[var(--shadow-card)]">
            <dt className="font-bold text-heading">{e.term}</dt>
            <dd className="mt-1 text-ink">{e.text}</dd>
          </div>
        ))}
      </dl>
    </ContentPage>
  );
}
