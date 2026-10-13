import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/Footer";

export function CalculatorPage({ title, intro, children, after }: { title: string; intro: string; children: ReactNode; after?: ReactNode }) {
  return (
    <>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/calculadoras" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted hover:text-heading">
          <ArrowLeft className="size-4" aria-hidden /> Calculadoras
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-heading">{title}</h1>
        <p className="mt-2 text-lg text-muted">{intro}</p>
        <div className="mt-6 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">{children}</div>
        {after && <div className="mt-8 space-y-3 text-ink [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-heading [&_p]:leading-relaxed">{after}</div>}
      </div>
      <Footer />
    </>
  );
}
