import { quoteRequestSchema } from "@/domain/schemas";
import type { QuoteRequest } from "@/domain/types";

// Una cotización compartida viaja en la URL (?c=...). Por privacidad se quita la
// placa y la fecha de nacimiento se reduce al año (el precio puede variar un poco).

function toBase64Url(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function anonymize(req: QuoteRequest): QuoteRequest {
  const { plate: _plate, ...vehicle } = req.vehicle;
  void _plate;
  return {
    ...req,
    vehicle,
    driver: { ...req.driver, birthdate: `${req.driver.birthdate.slice(0, 4)}-07-01` },
  };
}

export function encodeShare(req: QuoteRequest) {
  return toBase64Url(JSON.stringify(anonymize(req)));
}

export function decodeShare(param: string): QuoteRequest | null {
  try {
    const parsed = quoteRequestSchema.safeParse(JSON.parse(fromBase64Url(param)));
    return parsed.success ? (parsed.data as QuoteRequest) : null;
  } catch {
    return null;
  }
}
