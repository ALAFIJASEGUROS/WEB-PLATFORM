import type {
  Answers,
  CoverageKey,
  ExcludedOffer,
  InsurerError,
  Offer,
  OfferLabel,
  Priority,
  QuoteResponse,
  ScoredOffer,
  Weights,
} from "@/domain/types";
import { SERVICE_KEYS } from "@/domain/types";
import { formatCOP, SERVICE_LABELS, USE_LABELS } from "@/domain/labels";

/** Cambia cuando cambian los pesos, las reglas o las etiquetas. */
export const ALGORITHM_VERSION = "2026.10-2";

/** Diferencia de puntaje por debajo de la cual dos ofertas se consideran empatadas. */
export const TIE_THRESHOLD = 2;

/** Peso de cada dimensión según la prioridad declarada por el usuario. */
export const PRIORITY_WEIGHTS: Record<
  Priority,
  { price: number; coverage: number; services: number }
> = {
  precio: { price: 0.6, coverage: 0.25, services: 0.15 },
  cobertura: { price: 0.2, coverage: 0.6, services: 0.2 },
  servicios: { price: 0.2, coverage: 0.3, services: 0.5 },
  equilibrio: { price: 0.4, coverage: 0.4, services: 0.2 },
};

/** Importancia base de cada cobertura (suma no necesariamente 1). */
function coverageWeights(a: Answers): Record<CoverageKey, number> {
  const w: Record<CoverageKey, number> = {
    rc: 3,
    perdidaTotalDanos: 3,
    perdidaParcialDanos: 2,
    perdidaTotalHurto: 2.5,
    perdidaParcialHurto: 1,
    eventosNaturaleza: 1,
    accidentesPersonales: 1,
  };
  if (a.parking === "calle") {
    w.perdidaTotalHurto += 1.5;
    w.perdidaParcialHurto += 1;
  }
  if (a.mileage === "alto") {
    w.perdidaParcialDanos += 1;
    w.eventosNaturaleza += 0.5;
  }
  if (a.use === "domicilios" || a.use === "trabajo") {
    w.accidentesPersonales += 1.5;
    w.rc += 1;
  }
  return w;
}

const PRICE_CURVE = 1.5;

const MAX_DEDUCTIBLE_BY_TOLERANCE = { bajo: 5, medio: 10, alto: 100 } as const;

function normalize(value: number, min: number, max: number) {
  return max === min ? 1 : (value - min) / (max - min);
}

/** Si el vehículo está financiado, el banco suele exigir daños y hurto total. */
export function meetsFinancingRequirements(o: Offer) {
  return o.coverages.perdidaTotalDanos && o.coverages.perdidaTotalHurto;
}

/** Pesos efectivos: los personalizados (0–100) o los de la prioridad elegida. */
export function effectiveWeights(answers: Answers) {
  const w = answers.weights;
  if (!w) return PRIORITY_WEIGHTS[answers.priority];
  return { price: w.price / 100, coverage: w.coverage / 100, services: w.services / 100 };
}

/** Reparte 100 puntos cambiando uno y ajustando los otros dos en proporción. */
export function rebalance(w: Weights, key: keyof Weights, value: number): Weights {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const others = (Object.keys(w) as (keyof Weights)[]).filter((k) => k !== key);
  const rest = 100 - v;
  const sum = others.reduce((s, k) => s + w[k], 0);
  const a = sum === 0 ? Math.round(rest / 2) : Math.round((w[others[0]] / sum) * rest);
  return { ...w, [key]: v, [others[0]]: a, [others[1]]: rest - a } as Weights;
}

export function weightsFromPriority(p: Priority): Weights {
  const w = PRIORITY_WEIGHTS[p];
  return { price: Math.round(w.price * 100), coverage: Math.round(w.coverage * 100), services: Math.round(w.services * 100) };
}

export function scoreOffers(offers: Offer[], answers: Answers): ScoredOffer[] {
  if (offers.length === 0) return [];
  const weights = effectiveWeights(answers);
  const cw = coverageWeights(answers);
  const cwTotal = Object.values(cw).reduce((s, n) => s + n, 0);

  const prices = offers.map((o) => o.annualPremium);
  const minP = Math.min(...prices);
  const rcs = offers.map((o) => o.rcLimit);
  const minRc = Math.min(...rcs);
  const maxRc = Math.max(...rcs);
  const wanted = answers.services.length
    ? answers.services
    : [...SERVICE_KEYS];

  const scored = offers.map((o): ScoredOffer => {
    const reasons: string[] = [];
    const warnings: string[] = [];

    // Curva relativa al más barato: una diferencia de pocos pesos no cambia el
    // puntaje, y pagar el doble deja el precio en ~0,35.
    const price = Math.pow(minP / o.annualPremium, PRICE_CURVE);

    const coverageSum = (Object.keys(cw) as CoverageKey[]).reduce(
      (s, k) => s + (o.coverages[k] ? cw[k] : 0),
      0,
    );
    const deductibleScore = 1 - Math.min(o.deductiblePct, 20) / 20;
    const coverage =
      0.7 * (coverageSum / cwTotal) +
      0.15 * normalize(o.rcLimit, minRc, maxRc) +
      0.15 * deductibleScore;

    const matched = wanted.filter((s) => o.services.includes(s));
    const services = matched.length / wanted.length;

    let score =
      weights.price * price +
      weights.coverage * coverage +
      weights.services * services;

    // Preferencias blandas: penalizan pero no excluyen (los requisitos duros van en `eligibility`).
    if (o.deductiblePct > MAX_DEDUCTIBLE_BY_TOLERANCE[answers.deductibleTolerance]) {
      score *= 0.85;
      warnings.push(
        `El deducible (${o.deductiblePct}%) es mayor al que prefieres.`,
      );
    }
    if (answers.parking === "calle" && !o.coverages.perdidaTotalHurto) {
      warnings.push("No cubre hurto y tu vehículo se parquea en la calle.");
    }

    if (price >= 0.8) reasons.push(`Precio competitivo: ${formatCOP(o.annualPremium)} al año.`);
    if (coverage >= 0.75) reasons.push("Cobertura amplia frente a las demás opciones.");
    if (o.deductiblePct === 0) reasons.push("Sin deducible.");
    if (answers.services.length && matched.length)
      reasons.push(
        `Incluye ${matched.length} de ${answers.services.length} servicios que te importan: ${matched
          .map((s) => SERVICE_LABELS[s].toLowerCase())
          .join(", ")}.`,
      );
    if (answers.mileage === "alto" && o.services.includes("grua") && o.services.includes("asistenciaViaje"))
      reasons.push("Incluye grúa y asistencia en viaje, útiles si recorres muchos kilómetros.");
    if (answers.financed && meetsFinancingRequirements(o))
      reasons.push("Cumple lo que normalmente exige el banco para vehículos financiados.");

    return {
      ...o,
      score: Math.round(score * 100),
      subscores: {
        price: Math.round(price * 100),
        coverage: Math.round(coverage * 100),
        services: Math.round(services * 100),
      },
      reasons,
      warnings,
      labels: [],
    };
  });

  scored.sort(
    (a, b) => b.score - a.score || a.annualPremium - b.annualPremium,
  );

  const addLabel = (o: ScoredOffer | undefined, l: OfferLabel) => o?.labels.push(l);
  // Empate técnico: si las dos primeras están a menos de TIE_THRESHOLD puntos,
  // se recomienda la más barata y ambas se marcan como empatadas.
  if (scored.length > 1 && scored[0].score - scored[1].score < TIE_THRESHOLD) {
    if (scored[1].annualPremium < scored[0].annualPremium) [scored[0], scored[1]] = [scored[1], scored[0]];
    addLabel(scored[0], "empate");
    addLabel(scored[1], "empate");
  }
  addLabel(scored[0], "recomendado");
  addLabel(
    [...scored].sort((a, b) => a.annualPremium - b.annualPremium)[0],
    "menorPrecio",
  );
  addLabel(
    [...scored].sort(
      (a, b) => b.subscores.coverage - a.subscores.coverage || a.annualPremium - b.annualPremium,
    )[0],
    "mayorCobertura",
  );
  return scored;
}

/**
 * Requisitos duros: si la oferta no los cumple, se descarta antes del puntaje
 * y se informa el motivo. Devuelve null si la oferta es elegible.
 */
export function eligibility(o: Offer, answers: Answers): string | null {
  if (o.allowedUses && !o.allowedUses.includes(answers.use))
    return `No cubre el uso ${USE_LABELS[answers.use]}.`;
  if (answers.financed && !meetsFinancingRequirements(o))
    return "No incluye daños y hurto total, que el banco exige si el vehículo está financiado.";
  return null;
}

/** Filtra por elegibilidad y ordena las ofertas que quedan. */
export function recommend(offers: Offer[], answers: Answers) {
  const eligible: Offer[] = [];
  const excluded: ExcludedOffer[] = [];
  for (const o of offers) {
    const reason = eligibility(o, answers);
    if (reason) excluded.push({ id: o.id, insurerName: o.insurerName, planName: o.planName, reason });
    else eligible.push(o);
  }
  return { offers: scoreOffers(eligible, answers), excluded };
}

export function buildQuoteResponse(offers: Offer[], errors: InsurerError[], answers: Answers): QuoteResponse {
  return { quoteId: crypto.randomUUID(), ...recommend(offers, answers), errors, algorithm: ALGORITHM_VERSION };
}
