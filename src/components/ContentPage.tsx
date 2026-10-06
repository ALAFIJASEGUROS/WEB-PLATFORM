import type { ReactNode } from "react";
import { Footer } from "./Footer";

export function ContentPage({
  title,
  intro,
  children,
  draft = false,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  draft?: boolean;
}) {
  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-heading">{title}</h1>
        {intro && <p className="mt-2 text-lg text-muted">{intro}</p>}
        {draft && (
          <p className="mt-4 rounded-xl bg-sun-soft p-3 text-sm text-sun-ink">
            Borrador para el MVP. Este texto debe ser revisado por un abogado antes de operar.
          </p>
        )}
        <div className="mt-6 space-y-4 text-ink [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-heading [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed">
          {children}
        </div>
      </article>
      <Footer />
    </>
  );
}
