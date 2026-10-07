"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Pencil, SlidersHorizontal } from "lucide-react";
import { formatCOP, PRIORITY_LABELS } from "@/domain/labels";
import type { QuoteRequest } from "@/domain/types";
import { fetchQuote } from "@/lib/api-client";
import { track } from "@/lib/analytics";
import { useExperimentExposure } from "@/lib/experiments";
import {
  quoteStore,
  useCompare,
  useHydrated,
  useQuoteRequest,
  useQuoteResponse,
} from "@/lib/quote-store";
import { Button, ButtonLink, SimulatedDataNotice } from "@/components/ui";
import { OfferCard } from "./OfferCard";
import { ShareQuote } from "./ShareQuote";
import { decodeShare } from "@/lib/share";

type Sort = "afinidad" | "precio" | "cobertura";
const MAX_COMPARE = 3;

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

  // Cotización compartida por enlace (?c=...): se carga y se limpia la URL.
  const sharing = hydrated && new URLSearchParams(window.location.search).has("c");
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("c");
    if (!param) return;
    const shared = decodeShare(param);
    if (shared) quoteStore.setRequest(shared);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  useExperimentExposure("boton-oferta-1", !!data?.offers.length);
  const quoteId = data?.quoteId;
  useEffect(() => {
    if (!quoteId || !data) return;
    track("resultados_vistos", {
      ofertas: data.offers.length,
      con_descuento: data.offers.filter((o) => o.discounts?.length).length,
      // Exposición al experimento A/B: el resto del embudo se cruza por sesión.
      ...(data.experiment && { variante: `${data.experiment.id}:${data.experiment.variant}` }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una vez por cotización
  }, [quoteId]);

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

  if (hydrated && !request && !sharing) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-heading">Aún no has cotizado</h1>
        <p className="mt-2 text-muted">Responde unas preguntas y te mostramos tus opciones.</p>
        <ButtonLink href="/cotizar" className="mt-6">Empezar</ButtonLink>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto size-10 text-coral" aria-hidden />
        <p className="mt-4 font-semibold text-heading">{error}</p>
        <Button className="mt-6" onClick={() => setError(null)}>Reintentar</Button>
      </div>
    );
  }

  if (!data || !request) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6" role="status" aria-live="polite">
        <p className="text-2xl font-extrabold tracking-tight text-heading">Consultando aseguradoras…</p>
        <p className="mt-1 text-sm text-muted">Comparamos precios, coberturas y servicios para ti. Toma unos segundos.</p>
        <div className="mt-6 space-y-4" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-line" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 rounded bg-line" />
                  <div className="h-3 w-1/3 rounded bg-line" />
                </div>
                <div className="size-14 rounded-full bg-line" />
              </div>
              <div className="mt-4 h-20 rounded-2xl bg-canvas" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const pill = "min-h-10 rounded-full border-2 border-line bg-surface px-3 text-sm font-semibold text-heading";
  const filters = (size: "sm" | "lg") => {
    const block = size === "lg" ? "w-full" : "";
    return (
      <>
        <label className={size === "lg" ? "block text-xs font-semibold text-muted" : "sr-only"} htmlFor={`sort-${size}`}>Ordenar por</label>
        <select id={`sort-${size}`} value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={`${pill} ${block}`}>
          <option value="afinidad">Más afines</option>
          <option value="precio">Menor precio</option>
          <option value="cobertura">Mayor cobertura</option>
        </select>
        <label className={size === "lg" ? "block text-xs font-semibold text-muted" : "sr-only"} htmlFor={`insurer-${size}`}>Aseguradora</label>
        <select id={`insurer-${size}`} value={insurer} onChange={(e) => setInsurer(e.target.value)} className={`${pill} ${block}`}>
          <option value="todas">Todas las aseguradoras</option>
          {insurers.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <button
          type="button"
          aria-pressed={onlyFull}
          onClick={() => setOnlyFull(!onlyFull)}
          className={`min-h-10 shrink-0 rounded-full border-2 px-3 text-sm font-semibold ${block} ${onlyFull ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-heading"}`}
        >
          Solo todo riesgo
        </button>
      </>
    );
  };

  const [top] = data.offers;
  const tie = top?.labels.includes("empate") ? data.offers[1] : undefined;
  const v = request.vehicle;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:grid lg:max-w-6xl lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8">
      <aside className="hidden lg:block" aria-label="Tu perfil y filtros">
        <div className="sticky top-24 space-y-4">
          <ProfileCard request={request} />
          <div className="space-y-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
            <p className="flex items-center gap-2 font-bold text-heading">
              <SlidersHorizontal className="size-4" aria-hidden /> Filtros
            </p>
            {filters("lg")}
          </div>
        </div>
      </aside>

      <div className="min-w-0">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-heading">
            {data.offers.length} opciones para tu {v.brand} {v.model} {v.year}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {request.answers.weights ? (
              <>Ordenadas según tus pesos: <strong>precio {request.answers.weights.price}% · cobertura {request.answers.weights.coverage}% · servicios {request.answers.weights.services}%</strong></>
            ) : (
              <>Ordenadas según tu prioridad: <strong>{PRIORITY_LABELS[request.answers.priority].toLowerCase()}</strong></>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end">
          <ShareQuote request={request} />
          <Link
            href={`/cotizar/${v.type}`}
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-brand hover:bg-brand-soft"
          >
            <Pencil className="size-4" aria-hidden /> Editar
          </Link>
        </div>
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
          {tie && (
            <p className="mb-3 rounded-xl bg-canvas px-3 py-2 text-sm text-ink">
              <strong>Empate técnico:</strong> {top.planName} y {tie.planName} ({tie.insurerName}) quedaron
              a menos de 2 puntos. Te recomendamos la más económica; compáralas si te importa algún
              detalle en particular.
            </p>
          )}
          <OfferCard
            offer={top}
            highlight
            comparing={compare.includes(top.id)}
            compareDisabled={compare.length >= MAX_COMPARE}
            onToggleCompare={() => toggleCompare(top.id)}
          />
        </section>
      )}

      <div className="hide-scrollbar -mx-4 mt-8 flex items-center gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        <SlidersHorizontal className="size-4 shrink-0 text-muted" aria-hidden />
        {filters("sm")}
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

      {!!data.excluded?.length && (
        <details className="mt-6 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]">
          <summary className="cursor-pointer text-sm font-semibold text-heading">
            {data.excluded.length === 1 ? "1 plan no aplica" : `${data.excluded.length} planes no aplican`} para tu caso
          </summary>
          <ul className="mt-3 space-y-2 text-sm">
            {data.excluded.map((o) => (
              <li key={o.id}>
                <span className="font-semibold text-ink">{o.planName}</span>{" "}
                <span className="text-muted">({o.insurerName}): {o.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      </div>

      {compare.length >= 2 && (
        <div className="pb-safe fixed inset-x-0 bottom-16 z-30 border-t border-line bg-navy px-4 pt-3 md:bottom-0">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 lg:max-w-6xl">
            <p className="text-sm font-semibold text-white">
              {compare.length} de {MAX_COMPARE} seleccionadas
            </p>
            <div className="flex items-center gap-2">
              <button type="button" className="min-h-11 px-3 text-sm text-white/80" onClick={() => quoteStore.setCompare([])}>
                Limpiar
              </button>
              <Button variant="accent" onClick={() => { track("comparacion_abierta", { ofertas: compare.length }); router.push("/comparar"); }}>Comparar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileCard({ request }: { request: QuoteRequest }) {
  const { vehicle: v, driver, answers: a } = request;
  const rows = [
    ["Vehículo", `${v.brand} ${v.model} ${v.year}`],
    ["Placa", v.plate ?? "—"],
    ["Valor asegurado", formatCOP(v.commercialValue)],
    ["Ciudad", driver.city],
    ["Uso", a.use === "particular" ? "Personal" : a.use === "trabajo" ? "Trabajo" : "Domicilios / plataformas"],
    ["Prioridad", a.weights ? `P ${a.weights.price} · C ${a.weights.coverage} · S ${a.weights.services}` : PRIORITY_LABELS[a.priority]],
  ];
  return (
    <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <p className="font-bold text-heading">Tu perfil</p>
        <Link href={`/cotizar/${v.type}`} className="text-sm font-semibold text-brand hover:underline">Editar</Link>
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.map(([k, val]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-semibold text-ink">{val}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
