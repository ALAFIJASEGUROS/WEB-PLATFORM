// Sandbox FALSO de Bolívar: responde con el formato supuesto de `schema.ts` y
// precios de la aseguradora simulada. Sirve para los tests (inyectando `fetch`)
// y para la ruta local /api/sandbox/bolivar. No es el sandbox real de Bolívar.
//
// Escenarios por placa: ERR* → 503 al cotizar · REC* → emisión rechazada ·
// PEN* → emisión en proceso hasta la siguiente consulta · INS* → inspección.
import type { QuoteRequest, VehicleUse } from "@/domain/types";
import { BOLIVAR_CONFIG } from "../mock/insurers";
import { priceOffers } from "../mock/tariff";
import { COVERAGE_CATALOG, SERVICE_CATALOG } from "./mapping";
import { issuePayloadSchema, quotePayloadSchema, type BolivarIssueResponse } from "./schema";

export const FAKE_CLIENT_ID = "sandbox-client";
export const FAKE_CLIENT_SECRET = "sandbox-secret";

interface Quote {
  plate: string;
  plans: string[];
}
interface SandboxState {
  tokens: Set<string>;
  quotes: Map<string, Quote>;
  issues: Map<string, BolivarIssueResponse & { pendingReads?: number }>;
  seq: number;
}

const covBack = Object.fromEntries(Object.entries(COVERAGE_CATALOG).map(([k, v]) => [v, k]));
const svcBack = Object.fromEntries(Object.entries(SERVICE_CATALOG).map(([k, v]) => [v, k]));
const json = (body: unknown, status = 200) => Response.json(body, { status });

export function createFakeBolivarSandbox() {
  const s: SandboxState = { tokens: new Set(), quotes: new Map(), issues: new Map(), seq: 0 };
  const id = (p: string) => `${p}-${String(++s.seq).padStart(6, "0")}`;

  function authorized(req: Request) {
    const t = req.headers.get("authorization")?.replace(/^Bearer /, "");
    return !!t && s.tokens.has(t);
  }

  async function handle(req: Request, path: string): Promise<Response> {
    const method = req.method;
    if (path === "/oauth/token" && method === "POST") {
      const form = new URLSearchParams(await req.text());
      if (form.get("client_id") !== FAKE_CLIENT_ID || form.get("client_secret") !== FAKE_CLIENT_SECRET) {
        return json({ error: "invalid_client" }, 401);
      }
      const token = id("tok");
      s.tokens.add(token);
      return json({ access_token: token, expires_in: 3600 });
    }
    if (path === "/salud") return json({ estado: "OK" });
    if (!authorized(req)) return json({ error: "no autorizado" }, 401);

    if (path === "/cotizaciones" && method === "POST") {
      const parsed = quotePayloadSchema.safeParse(await req.json().catch(() => null));
      if (!parsed.success) return json({ error: "payload inválido" }, 400);
      const p = parsed.data;
      const plate = p.vehiculo.placa ?? "";
      if (plate.startsWith("ERR")) return json({ error: "servicio no disponible" }, 503);
      const canonical: QuoteRequest = {
        vehicle: {
          type: p.producto === "AUTOS" ? "auto" : "moto",
          plate,
          brand: p.vehiculo.marca,
          model: p.vehiculo.linea,
          year: p.vehiculo.modelo,
          commercialValue: p.vehiculo.valorAsegurado,
          engineCc: p.vehiculo.cilindraje,
        },
        driver: { birthdate: p.conductor.fechaNacimiento, city: p.conductor.ciudad },
        answers: {
          priority: "equilibrio",
          use: p.vehiculo.uso.toLowerCase() as VehicleUse,
          parking: p.riesgo.parqueaderoCerrado ? "cerrado" : "calle",
          mileage: p.riesgo.kilometrajeMensual.toLowerCase() as "bajo" | "medio" | "alto",
          drivers: p.riesgo.conductoresAdicionales ? "varios" : "solo",
          financed: false,
          deductibleTolerance: "medio",
          services: [],
          claimsLast3Years: p.riesgo.siniestrosUltimos3Anios,
        },
      };
      const offers = priceOffers(canonical, BOLIVAR_CONFIG);
      const cotizacionId = id("COT");
      const plans = offers.map((o) => o.id.split(":")[1]);
      s.quotes.set(cotizacionId, { plate, plans });
      return json({
        cotizacionId,
        vigenciaHasta: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
        planes: offers.map((o) => ({
          codigo: o.id.split(":")[1],
          nombre: o.planName,
          primaTotal: o.annualPremium,
          limiteRc: o.rcLimit,
          coberturas: Object.entries(o.coverages).filter(([, v]) => v).map(([k]) => covBack[k]),
          asistencias: o.services.map((k) => svcBack[k]),
          deducible: { porcentaje: o.deductiblePct, minimoSmmlv: o.deductibleMinSmmlv },
          diasVehiculoReemplazo: o.substituteCarDays,
          exclusiones: o.exclusions.slice(-2),
          ...(o.allowedUses && { usosPermitidos: o.allowedUses.map((u) => u.toUpperCase()) }),
          ...(o.maxEngineCc && { cilindrajeMaximo: o.maxEngineCc }),
        })),
      });
    }

    if (path === "/emisiones" && method === "POST") {
      const key = req.headers.get("idempotency-key");
      if (!key) return json({ error: "falta Idempotency-Key" }, 400);
      const prev = s.issues.get(key);
      if (prev) return json(readIssue(prev));
      const parsed = issuePayloadSchema.safeParse(await req.json().catch(() => null));
      if (!parsed.success) return json({ error: "payload inválido" }, 400);
      const quote = s.quotes.get(parsed.data.cotizacionId);
      if (!quote || !quote.plans.includes(parsed.data.codigoPlan)) return json({ error: "cotización no existe" }, 422);
      const solicitudId = id("SOL");
      const issue: BolivarIssueResponse & { pendingReads?: number } = quote.plate.startsWith("REC")
        ? { solicitudId, estado: "RECHAZADA", motivo: "El vehículo no cumple las políticas de suscripción." }
        : quote.plate.startsWith("INS")
          ? { solicitudId, estado: "INSPECCION", instrucciones: "Agenda la inspección en un centro autorizado." }
          : quote.plate.startsWith("PEN")
            ? { solicitudId, estado: "EN_PROCESO", pendingReads: 1 }
            : emitted(solicitudId);
      s.issues.set(key, issue);
      return json(publicIssue(issue), 201);
    }

    const status = path.match(/^\/emisiones\/([^/]+)$/);
    if (status && method === "GET") {
      const issue = s.issues.get(decodeURIComponent(status[1]));
      return issue ? json(readIssue(issue)) : json({ error: "no existe" }, 404);
    }

    const doc = path.match(/^\/polizas\/([^/]+)\/documento$/);
    if (doc && method === "GET") {
      const number = decodeURIComponent(doc[1]);
      const exists = [...s.issues.values()].some((i) => i.numeroPoliza === number);
      if (!exists) return json({ error: "no existe" }, 404);
      return json({ url: `https://sandbox.invalid/polizas/${number}.pdf`, tipoContenido: "application/pdf", versionCondicionado: "AUTOS-2026-01" });
    }
    return json({ error: "ruta no encontrada" }, 404);
  }

  function emitted(solicitudId: string): BolivarIssueResponse {
    return { solicitudId, estado: "EMITIDA", numeroPoliza: `BOL-${String(++s.seq).padStart(8, "0")}` };
  }

  /** Una emisión en proceso se resuelve después de una lectura. */
  function readIssue(issue: BolivarIssueResponse & { pendingReads?: number }) {
    if (issue.estado === "EN_PROCESO") {
      if ((issue.pendingReads ?? 0) > 0) issue.pendingReads!--;
      else Object.assign(issue, emitted(issue.solicitudId));
    }
    return publicIssue(issue);
  }

  function publicIssue(issue: BolivarIssueResponse & { pendingReads?: number }): BolivarIssueResponse {
    const body = { ...issue };
    delete body.pendingReads;
    return body;
  }

  /** `fetch` que atiende cualquier URL bajo `baseUrl` con el sandbox. */
  function fetchFor(baseUrl: string): typeof fetch {
    return async (input, init) => {
      const req = new Request(input, init);
      init?.signal?.throwIfAborted();
      const url = new URL(req.url);
      const base = new URL(baseUrl);
      if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw new TypeError("fetch failed");
      return handle(req, url.pathname.slice(base.pathname.replace(/\/$/, "").length) || "/");
    };
  }

  return { handle, fetchFor, state: s };
}
