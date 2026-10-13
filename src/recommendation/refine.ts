import type { Answers, QuoteRequest, QuoteResponse } from "@/domain/types";
import { scoreOffers } from "./scoring";

/**
 * Reordena las opciones ya cotizadas con otras respuestas (pesos, deducible),
 * sin volver a consultar a las aseguradoras. Los requisitos duros (uso,
 * financiación, cilindraje) no cambian, así que las excluidas siguen igual.
 */
export function rescore(request: QuoteRequest, response: QuoteResponse, answers: Answers) {
  return {
    request: { ...request, answers },
    // Con pesos propios el experimento A/B de pesos ya no aplica.
    response: {
      ...response,
      offers: scoreOffers(response.offers, answers, { vehicle: request.vehicle }),
      experiment: undefined,
    } satisfies QuoteResponse,
  };
}
