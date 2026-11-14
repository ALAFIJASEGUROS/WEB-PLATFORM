import { describe, expect, it, vi } from "vitest";
import type { Answers, QuoteRequest } from "@/domain/types";
import { InsurerUnavailableError } from "../adapter";
import { describeAdapterContract } from "../contract.suite";
import { BOLIVAR_CONFIG } from "../mock/insurers";
import { priceOffers } from "../mock/tariff";
import { createBolivarAdapter } from "./adapter";
import { bolivarConfig, missingConfig, type BolivarConfig } from "./config";
import { createFakeBolivarSandbox, FAKE_CLIENT_ID, FAKE_CLIENT_SECRET } from "./fake-sandbox";
import { bolivarAdapter } from "./index";
import { toQuotePayload } from "./mapping";

const BASE = "https://bolivar.sandbox.test/api";
const config: BolivarConfig = {
  mode: "sandbox",
  baseUrl: BASE,
  tokenUrl: `${BASE}/oauth/token`,
  clientId: FAKE_CLIENT_ID,
  clientSecret: FAKE_CLIENT_SECRET,
  intermediaryCode: "INT-001",
  contractModel: "agencia",
  quoteTimeoutMs: 5000,
};

const answers: Answers = {
  priority: "equilibrio",
  use: "particular",
  parking: "cerrado",
  mileage: "medio",
  drivers: "solo",
  financed: false,
  deductibleTolerance: "medio",
  services: [],
  claimsLast3Years: 0,
};
const auto: QuoteRequest = {
  vehicle: { type: "auto", plate: "ABC123", brand: "Mazda", model: "Mazda 2", year: 2022, commercialValue: 70_000_000 },
  driver: { birthdate: "1990-05-10", city: "Medellín" },
  answers,
};
const moto: QuoteRequest = {
  vehicle: { type: "moto", plate: "ABC12D", brand: "Yamaha", model: "NMAX 155", year: 2023, commercialValue: 13_000_000, engineCc: 155 },
  driver: { birthdate: "1995-03-03", city: "Cali" },
  answers,
};

function setup(overrides: Partial<BolivarConfig> = {}) {
  const sandbox = createFakeBolivarSandbox();
  const fetch = vi.fn(sandbox.fetchFor(BASE));
  const adapter = createBolivarAdapter({ ...config, ...overrides }, { fetch, regulatory: BOLIVAR_CONFIG.regulatory, onUnknownCodes: () => {} });
  return { sandbox, fetch, adapter };
}

describeAdapterContract(setup().adapter, {
  requests: { auto, moto },
  quoteFailPlate: "ERR123",
  rejectPlate: "REC123",
  pendingPlate: "PEN123",
});

describe("configuración de Bolívar", () => {
  it("usa el mock por defecto y reconoce sandbox y prod", () => {
    expect(bolivarConfig({}).mode).toBe("mock");
    expect(bolivarConfig({ INSURER_BOLIVAR_MODE: "Sandbox" }).mode).toBe("sandbox");
    expect(bolivarConfig({ INSURER_BOLIVAR_MODE: "prod", BOLIVAR_API_URL: "https://x.co/api/" }).baseUrl).toBe("https://x.co/api");
    expect(bolivarAdapter(bolivarConfig({})).regulatory.contractModel).toBe("simulado");
    expect(bolivarConfig({ INSURER_BOLIVAR_MODE: "prod", BOLIVAR_CONTRACT_MODEL: "corredor" }).contractModel).toBe("corredor");
    expect(bolivarConfig({ BOLIVAR_CONTRACT_MODEL: "otra" }).contractModel).toBe("agencia");
  });

  it("sin credenciales no llama a la red y lo reporta", async () => {
    const c = bolivarConfig({ INSURER_BOLIVAR_MODE: "sandbox" });
    expect(missingConfig(c)).toContain("BOLIVAR_CLIENT_SECRET");
    const fetch = vi.fn();
    const adapter = createBolivarAdapter(c, { fetch, regulatory: BOLIVAR_CONFIG.regulatory });
    await expect(adapter.quote(auto, AbortSignal.timeout(1000))).rejects.toBeInstanceOf(InsurerUnavailableError);
    expect((await adapter.healthcheck!(AbortSignal.timeout(1000))).ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("adaptador HTTP de Bolívar", () => {
  it("traduce el cuestionario al payload de Bolívar", () => {
    const p = toQuotePayload({ ...auto, answers: { ...answers, use: "trabajo", parking: "calle", drivers: "varios" } }, "INT-001");
    expect(p).toMatchObject({
      codigoIntermediario: "INT-001",
      producto: "AUTOS",
      vehiculo: { placa: "ABC123", uso: "TRABAJO", modelo: 2022 },
      riesgo: { parqueaderoCerrado: false, conductoresAdicionales: true, kilometrajeMensual: "MEDIO" },
    });
  });

  it("normaliza las ofertas igual que la tarifa simulada y guarda el id de cotización", async () => {
    const { adapter } = setup();
    const offers = await adapter.quote(auto, AbortSignal.timeout(5000));
    const expected = priceOffers(auto, BOLIVAR_CONFIG);
    expect(offers.map((o) => [o.id, o.annualPremium, o.coverages, o.services])).toEqual(
      expected.map((o) => [o.id, o.annualPremium, o.coverages, o.services]),
    );
    expect(offers.every((o) => o.externalQuoteId?.startsWith("COT-"))).toBe(true);
  });

  it("reutiliza el token y lo renueva si la API responde 401", async () => {
    const { adapter, fetch, sandbox } = setup();
    await adapter.quote(auto, AbortSignal.timeout(5000));
    await adapter.quote(auto, AbortSignal.timeout(5000));
    const tokenCalls = () => fetch.mock.calls.filter(([u]) => String(u).endsWith("/oauth/token")).length;
    expect(tokenCalls()).toBe(1);
    sandbox.state.tokens.clear(); // Bolívar revoca los tokens
    await adapter.quote(auto, AbortSignal.timeout(5000));
    expect(tokenCalls()).toBe(2);
  });

  it("clasifica la red caída como error técnico", async () => {
    const adapter = createBolivarAdapter(config, {
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
      regulatory: BOLIVAR_CONFIG.regulatory,
    });
    await expect(adapter.quote(auto, AbortSignal.timeout(1000))).rejects.toBeInstanceOf(InsurerUnavailableError);
  });

  it("propaga la cancelación del llamador sin convertirla en error técnico", async () => {
    const { adapter } = setup();
    const err = await adapter.quote(auto, AbortSignal.abort()).catch((e) => e);
    expect(err).not.toBeInstanceOf(InsurerUnavailableError);
  });

  it("rechaza un formato de respuesta inesperado", async () => {
    const { sandbox } = setup();
    const broken: typeof fetch = async (input, init) => {
      const res = await sandbox.fetchFor(BASE)(input, init);
      return String(input).endsWith("/cotizaciones") ? Response.json({ planes: "?" }) : res;
    };
    const a = createBolivarAdapter(config, { fetch: broken, regulatory: BOLIVAR_CONFIG.regulatory });
    await expect(a.quote(auto, AbortSignal.timeout(1000))).rejects.toThrow(/formato inesperado/);
  });

  it("avisa los códigos de cobertura fuera del catálogo", async () => {
    const sandbox = createFakeBolivarSandbox();
    const withUnknown: typeof fetch = async (input, init) => {
      const res = await sandbox.fetchFor(BASE)(input, init);
      if (!String(input).endsWith("/cotizaciones")) return res;
      const body = await res.json();
      body.planes[0].coberturas.push("XYZ");
      return Response.json(body);
    };
    const onUnknownCodes = vi.fn();
    const a = createBolivarAdapter(config, { fetch: withUnknown, regulatory: BOLIVAR_CONFIG.regulatory, onUnknownCodes });
    await a.quote(auto, AbortSignal.timeout(1000));
    expect(onUnknownCodes).toHaveBeenCalledWith(["XYZ"]);
  });

  it("devuelve la inspección como estado y envía la clave de idempotencia", async () => {
    const { adapter, fetch } = setup();
    const req = { ...auto, vehicle: { ...auto.vehicle, plate: "INS123" } };
    const [offer] = await adapter.quote(req, AbortSignal.timeout(5000));
    const r = await adapter.issue({
      offer,
      quote: req,
      holder: { documentType: "CC", documentNumber: "1", fullName: "Ana" },
      kyc: { ocupacion: "empleado" },
      startDate: "2026-12-01",
      idempotencyKey: "orden-1",
    });
    expect(r).toMatchObject({ status: "requiere_inspeccion", instructions: expect.stringMatching(/inspección/) });
    const issueCall = fetch.mock.calls.find(([u]) => String(u).endsWith("/emisiones"))!;
    expect(new Headers(issueCall[1]!.headers).get("Idempotency-Key")).toBe("orden-1");
  });
});
