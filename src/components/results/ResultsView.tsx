"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Pencil, SlidersHorizontal } from "lucide-react";
import type { QuoteRequest, QuoteResponse } from "@/domain/types";
import { PRIORITY_LABELS } from "@/domain/labels";
import {
  quoteStore,
  useCompare,
  useHydrated,
  useQuoteRequest,
  useQuoteResponse,
} from "@/lib/quote-store";
import { Button, ButtonLink, SimulatedDataNotice } from "@/components/ui";
import { OfferCard } from "./OfferCard";

type Sort = "afinidad" | "precio" | "cobertura";
const MAX_COMPARE = 3;

async function fetchQuote(req: QuoteRequest): Promise<QuoteResponse> {
  const res = await fetch("/api/cotizaciones", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function ResultsView() {
  const router = useRouter();
  const hydrated = useHydrated();
  const request = useQuoteRequest();
  const data = useQuoteResponse();
  const compare = useCompare();
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("afinidad");
  const [insurer, setInsurer] = useState("todas");
  const [onlyFull, setOnlyFull] = useState(false);

  useEffect(() => {
    if (!request || data || error) return;
    let active = true;
    fetchQuote(request)
      .then((res) => active && quoteStore.setResponse(res))
      .catch(() => active && setError("No pudimos consultar las aseguradoras. Intenta de nuevo."));
    return () => {
      active = false;
    };
  }, [request, data, error]);

  const offers = useMemo(() => {
    if (!data) return [];
    let list = data.offers.filter(
      (o) =>
        (insurer === "todas" || o.insurerId === insurer) &&
        (!onlyFull || (o.coverages.perdidaTotalDanos && o.coverages.perdidaParcialDanos)),
    );
    if (sort === "precio") list = [...list].sort((a, b) => a.annualPremium - b.annualPremium);
    if (sort === "cobertura")
      list = [...list].sort((a, b) => b.subscores.coverage - a.subscores.coverage);
    return list;
  }, [data, sort, insurer, onlyFull]);

  const insurers = useMemo(
    () => [...new Map(data?.offers.map((o) => [o.insurerId, o.insurerName])).entries()],
    [data],
  );

  function toggleCompare(id: string) {
    const next = compare.includes(id)
      ? compare.filter((x) => x !== id)
      : [...compare, id].slice(0, MAX_COMPARE);
    quoteStore.setCompare(next);
  }

  if (hydrated && !request) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-navy">Aún no has cotizado</h1>
        <p className="mt-2 text-muted">Responde unas preguntas y te mostramos tus opciones.</p>
        <ButtonLink href="/cotizar" className="mt-6">Empezar</ButtonLink>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto size-10 text-coral" aria-hidden />
        <p className="mt-4 font-semibold text-navy">{error}</p>
        <Button className="mt-6" onClick={() => setError(null)}>Reintentar</Button>
      </div>
    );
  }

  if (!data || !request) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center" role="status" aria-live="polite">
        <span className="size-14 animate-spin rounded-full border-4 border-brand-soft border-t-brand" aria-hidden />
        <h1 className="mt-6 text-2xl font-extrabold text-navy">Consultando aseguradoras…</h1>
        <p className="mt-2 text-muted">Estamos comparando opciones para tu {request?.vehicle.type === "moto" ? "moto" : "carro"}.</p>
      </div>
    );
  }

  const [top] = data.offers;
  const v = request.vehicle;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy">
            {data.offers.length} opciones para tu {v.brand} {v.model} {v.year}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Ordenadas según tu prioridad: <strong>{PRIORITY_LABELS[request.answers.priority].toLowerCase()}</strong>
          </p>
        </div>
        <Link
          href={`/cotizar/${v.type}`}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold text-brand hover:bg-brand-soft"
        >
          <Pencil className="size-4" aria-hidden /> Editar
        </Link>
      </div>

      <SimulatedDataNotice />

      {data.errors.map((e) => (
        <p key={e.insurerId} role="status" className="mt-3 flex gap-2 rounded-xl bg-coral-soft px-3 py-2 text-sm text-coral">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {e.message} Mostramos las demás opciones.
        </p>
      ))}

      {top && sort === "afinidad" && insurer === "todas" && !onlyFull && (
        <section aria-labelledby="rec" className="mt-6">
          <h2 id="rec" className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
            Nuestra recomendación
          </h2>
          <OfferCard
            offer={top}
            highlight
            comparing={compare.includes(top.id)}
            compareDisabled={compare.length >= MAX_COMPARE}
            onToggleCompare={() => toggleCompare(top.id)}
          />
        </section>
      )}

      <div className="hide-scrollbar -mx-4 mt-8 flex items-center gap-2 overflow-x-auto px-4 pb-1">
        <SlidersHorizontal className="size-4 shrink-0 text-muted" aria-hidden />
        <label className="sr-only" htmlFor="sort">Ordenar por</label>
        <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="min-h-10 rounded-full border-2 border-line bg-white px-3 text-sm font-semibold text-navy">
          <option value="afinidad">Más afines</option>
          <option value="precio">Menor precio</option>
          <option value="cobertura">Mayor cobertura</option>
        </select>
        <label className="sr-only" htmlFor="insurer">Aseguradora</label>
        <select id="insurer" value={insurer} onChange={(e) => setInsurer(e.target.value)} className="min-h-10 rounded-full border-2 border-line bg-white px-3 text-sm font-semibold text-navy">
          <option value="todas">Todas las aseguradoras</option>
          {insurers.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <button
          type="button"
          aria-pressed={onlyFull}
          onClick={() => setOnlyFull(!onlyFull)}
          className={`min-h-10 shrink-0 rounded-full border-2 px-3 text-sm font-semibold ${onlyFull ? "border-brand bg-brand-soft text-brand" : "border-line bg-white text-navy"}`}
        >
          Todo riesgo
        </button>
      </div>

      <h2 className="sr-only">Todas las opciones</h2>
      <div className="mt-4 space-y-4">
        {offers
          .filter((o) => !(o.id === top?.id && sort === "afinidad" && insurer === "todas" && !onlyFull))
          .map((o) => (
            <OfferCard
              key={o.id}
              offer={o}
              comparing={compare.includes(o.id)}
              compareDisabled={compare.length >= MAX_COMPARE}
              onToggleCompare={() => toggleCompare(o.id)}
            />
          ))}
        {offers.length === 0 && (
          <p className="py-10 text-center text-muted">Ninguna opción cumple esos filtros.</p>
        )}
      </div>

      {compare.length >= 2 && (
        <div className="pb-safe fixed inset-x-0 bottom-16 z-30 border-t border-line bg-navy px-4 pt-3 md:bottom-0">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">
              {compare.length} de {MAX_COMPARE} seleccionadas
            </p>
            <div className="flex items-center gap-2">
              <button type="button" className="min-h-11 px-3 text-sm text-white/80" onClick={() => quoteStore.setCompare([])}>
                Limpiar
              </button>
              <Button variant="accent" onClick={() => router.push("/comparar")}>Comparar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
