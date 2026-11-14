// Adaptador HTTP de Seguros Bolívar.
//
// Endpoints SUPUESTOS hasta recibir la especificación (ver schema.ts):
//   POST /cotizaciones                   → cotización
//   POST /emisiones   (Idempotency-Key)  → emisión
//   GET  /emisiones/{clave}              → estado de la emisión
//   GET  /polizas/{numero}/documento     → documento de la póliza
//   GET  /salud                          → healthcheck
import type { z } from "zod";
import {
  ADAPTER_CONTRACT_VERSION,
  InsurerUnavailableError,
  type AdapterCapabilities,
  type InsurerAdapter,
  type RegulatoryInfo,
} from "../adapter";
import type { BolivarConfig } from "./config";
import { missingConfig } from "./config";
import { BOLIVAR_ID, BOLIVAR_NAME, toIssuePayload, toIssueResult, toOffers, toQuotePayload, unknownCodes } from "./mapping";
import {
  documentResponseSchema,
  issueResponseSchema,
  quoteResponseSchema,
  tokenResponseSchema,
} from "./schema";

type Fetch = typeof fetch;

export interface BolivarAdapterDeps {
  fetch?: Fetch;
  regulatory: RegulatoryInfo;
  capabilities?: Partial<AdapterCapabilities>;
  /** Aviso de códigos fuera del catálogo; por defecto, a la consola. */
  onUnknownCodes?: (codes: string[]) => void;
}

/** Error de la API que no es técnico (4xx): un bug de integración, no se reintenta igual. */
export class BolivarApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const ISSUE_TIMEOUT_MS = 20_000;

export function createBolivarAdapter(config: BolivarConfig, deps: BolivarAdapterDeps): InsurerAdapter {
  const doFetch: Fetch = deps.fetch ?? ((...args) => fetch(...args));
  const missing = missingConfig(config);
  const capabilities: AdapterCapabilities = {
    // Valores provisionales hasta confirmarlos con Bolívar.
    quoteTtlMinutes: 60 * 24,
    quoteTimeoutMs: config.quoteTimeoutMs,
    asyncIssue: true,
    requiresInspection: true,
    policyDocument: true,
    ...deps.capabilities,
  };
  let token: { value: string; expiresAt: number } | undefined;

  function ensureConfigured() {
    if (missing.length > 0) {
      throw new InsurerUnavailableError(`${BOLIVAR_NAME} no está configurada (falta ${missing.join(", ")}).`);
    }
  }

  async function send(input: string, init: RequestInit): Promise<Response> {
    try {
      return await doFetch(input, init);
    } catch (e) {
      // Cancelación o timeout del llamador: se propaga tal cual.
      if (init.signal?.aborted) throw init.signal.reason;
      throw new InsurerUnavailableError(`${BOLIVAR_NAME} no respondió (${e instanceof Error ? e.message : "red"}).`);
    }
  }

  async function accessToken(signal: AbortSignal, force = false): Promise<string> {
    if (!force && token && token.expiresAt > Date.now() + 30_000) return token.value;
    const res = await send(config.tokenUrl!, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: config.clientId!,
        client_secret: config.clientSecret!,
      }),
      signal,
    });
    if (!res.ok) throw new InsurerUnavailableError(`${BOLIVAR_NAME} rechazó la autenticación (${res.status}).`);
    const body = tokenResponseSchema.parse(await res.json());
    token = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
    return token.value;
  }

  /** Llamada autenticada. Devuelve `null` en 404 si `allow404`. */
  async function call<T extends z.ZodType>(
    method: "GET" | "POST",
    path: string,
    schema: T,
    opts: { body?: unknown; signal: AbortSignal; headers?: Record<string, string>; allow404?: boolean },
  ): Promise<z.infer<T> | null> {
    ensureConfigured();
    for (let attempt = 1; ; attempt++) {
      const res = await send(`${config.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${await accessToken(opts.signal, attempt > 1)}`,
          Accept: "application/json",
          ...(opts.body !== undefined && { "Content-Type": "application/json" }),
          ...opts.headers,
        },
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: opts.signal,
      });
      // Token vencido o revocado: se renueva una vez.
      if (res.status === 401 && attempt === 1) continue;
      if (res.status === 404 && opts.allow404) return null;
      if (res.status >= 500 || res.status === 429 || res.status === 408) {
        throw new InsurerUnavailableError(`${BOLIVAR_NAME} no está disponible (${res.status}).`);
      }
      if (!res.ok) throw new BolivarApiError(`${BOLIVAR_NAME} respondió ${res.status} en ${method} ${path}.`, res.status);
      const parsed = schema.safeParse(await res.json().catch(() => undefined));
      if (!parsed.success) {
        // Formato inesperado: probablemente cambió la API. No es reintentable.
        throw new BolivarApiError(`${BOLIVAR_NAME} devolvió un formato inesperado en ${method} ${path}.`, res.status);
      }
      return parsed.data;
    }
  }

  return {
    id: BOLIVAR_ID,
    name: BOLIVAR_NAME,
    contractVersion: ADAPTER_CONTRACT_VERSION,
    supports: ["auto", "moto"],
    capabilities,
    regulatory: deps.regulatory,

    async quote(req, signal) {
      const res = (await call("POST", "/cotizaciones", quoteResponseSchema, {
        body: toQuotePayload(req, config.intermediaryCode!),
        signal,
      }))!;
      const unknown = unknownCodes(res);
      if (unknown.length > 0) {
        (deps.onUnknownCodes ?? ((c) => console.warn(`[bolivar] códigos fuera del catálogo: ${c.join(", ")}`)))(unknown);
      }
      return toOffers(res, req);
    },

    async issue(req) {
      const res = (await call("POST", "/emisiones", issueResponseSchema, {
        body: toIssuePayload(req, config.intermediaryCode!),
        headers: { "Idempotency-Key": req.idempotencyKey },
        signal: AbortSignal.timeout(ISSUE_TIMEOUT_MS),
      }))!;
      return toIssueResult(res);
    },

    async getIssueStatus(idempotencyKey, signal = AbortSignal.timeout(ISSUE_TIMEOUT_MS)) {
      const res = await call("GET", `/emisiones/${encodeURIComponent(idempotencyKey)}`, issueResponseSchema, {
        signal,
        allow404: true,
      });
      return res && toIssueResult(res);
    },

    async getPolicyDocument(policyNumber, signal = AbortSignal.timeout(ISSUE_TIMEOUT_MS)) {
      const res = await call("GET", `/polizas/${encodeURIComponent(policyNumber)}/documento`, documentResponseSchema, {
        signal,
        allow404: true,
      });
      if (!res) throw new Error(`${BOLIVAR_NAME}: la póliza ${policyNumber} no existe.`);
      return { contentType: res.tipoContenido, url: res.url, conditionsVersion: res.versionCondicionado };
    },

    async healthcheck(signal) {
      const started = Date.now();
      if (missing.length > 0) return { ok: false, latencyMs: 0, detail: `Falta configurar ${missing.join(", ")}` };
      try {
        await accessToken(signal);
        const res = await send(`${config.baseUrl}/salud`, { signal, headers: { Authorization: `Bearer ${token!.value}` } });
        return { ok: res.ok, latencyMs: Date.now() - started, detail: `HTTP ${res.status}` };
      } catch (e) {
        return { ok: false, latencyMs: Date.now() - started, detail: e instanceof Error ? e.message : String(e) };
      }
    },
  };
}
