// Tests de contrato que todo adaptador de aseguradora debe pasar, simulado o real.
// Uso: `describeAdapterContract(adapter, { ... })` dentro de un archivo *.test.ts.
// Para un adaptador real, apúntalo al sandbox y pasa solo los escenarios que
// la aseguradora permita forzar (placas de prueba, cabeceras, etc.).
import { describe, expect, it } from "vitest";
import type { QuoteRequest, VehicleType } from "@/domain/types";
import {
  InsurerUnavailableError,
  isCompatibleContract,
  type InsurerAdapter,
  type IssueRequest,
} from "./adapter";

export interface ContractScenarios {
  /** Solicitud de cotización válida por tipo de vehículo que el adaptador soporta. */
  requests: Partial<Record<VehicleType, QuoteRequest>>;
  /** Placa que provoca un error técnico al cotizar. */
  quoteFailPlate?: string;
  /** Placa cuya emisión es rechazada por suscripción. */
  rejectPlate?: string;
  /** Placa cuya emisión queda pendiente en el primer intento. */
  pendingPlate?: string;
  /** Timeout de cada cotización en las pruebas. */
  timeoutMs?: number;
}

let seq = 0;
const key = (adapterId: string) => `contrato-${adapterId}-${Date.now()}-${++seq}`;

function issueRequest(quote: QuoteRequest, offer: IssueRequest["offer"], idempotencyKey: string): IssueRequest {
  return {
    offer,
    quote,
    holder: { documentType: "CC", documentNumber: "1000000001", fullName: "Prueba Contrato" },
    kyc: {},
    startDate: "2026-12-01",
    idempotencyKey,
  };
}

export function describeAdapterContract(adapter: InsurerAdapter, s: ContractScenarios) {
  const timeoutMs = s.timeoutMs ?? 5000;
  const quote = (req: QuoteRequest) => adapter.quote(req, AbortSignal.timeout(timeoutMs));
  const withPlate = (req: QuoteRequest, plate: string): QuoteRequest => ({ ...req, vehicle: { ...req.vehicle, plate } });
  const firstRequest = () => {
    const req = adapter.supports.map((t) => s.requests[t]).find(Boolean);
    if (!req) throw new Error(`Falta una solicitud de prueba para ${adapter.supports.join(", ")}`);
    return req;
  };

  describe(`Contrato de adaptador: ${adapter.name}`, () => {
    it("declara metadatos válidos y una versión compatible", () => {
      expect(adapter.id).toMatch(/^[a-z0-9-]+$/);
      expect(adapter.name.length).toBeGreaterThan(0);
      expect(isCompatibleContract(adapter.contractVersion)).toBe(true);
      expect(adapter.supports.length).toBeGreaterThan(0);
      expect(adapter.capabilities.quoteTtlMinutes).toBeGreaterThan(0);
      for (const f of adapter.regulatory.kycFields) {
        if (f.type === "select") expect(f.options?.length).toBeGreaterThan(0);
      }
    });

    for (const type of ["auto", "moto"] as const) {
      const req = s.requests[type];
      if (!adapter.supports.includes(type) || !req) continue;
      it(`cotiza ${type} con ofertas normalizadas`, async () => {
        const offers = await quote(req);
        expect(offers.length).toBeGreaterThan(0);
        const ids = new Set<string>();
        for (const o of offers) {
          expect(o.insurerId).toBe(adapter.id);
          expect(o.vehicleType).toBe(type);
          expect(o.annualPremium).toBeGreaterThan(0);
          expect(o.coverages.rc).toBe(true);
          expect(Date.parse(o.validUntil)).toBeGreaterThan(Date.now());
          expect(ids.has(o.id)).toBe(false);
          ids.add(o.id);
        }
      });
    }

    it("respeta la señal de cancelación", async () => {
      await expect(adapter.quote(firstRequest(), AbortSignal.abort())).rejects.toBeDefined();
    });

    if (s.quoteFailPlate) {
      const plate = s.quoteFailPlate;
      it("reporta los errores técnicos como InsurerUnavailableError", async () => {
        await expect(quote(withPlate(firstRequest(), plate))).rejects.toBeInstanceOf(InsurerUnavailableError);
      });
    }

    it("emite de forma idempotente y entrega el documento", async () => {
      const req = firstRequest();
      const [offer] = await quote(req);
      const k = key(adapter.id);
      let first = await adapter.issue(issueRequest(req, offer, k));
      if (first.status === "pendiente") first = await adapter.issue(issueRequest(req, offer, k));
      expect(first.status).toBe("emitida");
      const again = await adapter.issue(issueRequest(req, offer, k));
      expect(again).toEqual(first);
      expect(await adapter.getIssueStatus(k)).toEqual(first);
      if (first.status === "emitida" && adapter.capabilities.policyDocument) {
        const doc = await adapter.getPolicyDocument(first.policyNumber);
        expect(doc.contentType.length).toBeGreaterThan(0);
        expect(doc.url || doc.data?.length).toBeTruthy();
      }
    });

    it("devuelve null para una emisión que no existe", async () => {
      expect(await adapter.getIssueStatus(key(adapter.id))).toBeNull();
    });

    if (s.rejectPlate) {
      const plate = s.rejectPlate;
      it("devuelve los rechazos de suscripción como estado, sin lanzar", async () => {
        const req = withPlate(firstRequest(), plate);
        const [offer] = await quote(req);
        const r = await adapter.issue(issueRequest(req, offer, key(adapter.id)));
        expect(r.status).toBe("rechazada");
      });
    }

    if (s.pendingPlate && adapter.capabilities.asyncIssue) {
      const plate = s.pendingPlate;
      it("resuelve una emisión pendiente con la misma clave", async () => {
        const req = withPlate(firstRequest(), plate);
        const [offer] = await quote(req);
        const k = key(adapter.id);
        expect((await adapter.issue(issueRequest(req, offer, k))).status).toBe("pendiente");
        expect((await adapter.getIssueStatus(k))?.status).toBe("pendiente");
        expect((await adapter.issue(issueRequest(req, offer, k))).status).toBe("emitida");
      });
    }

    if (adapter.healthcheck) {
      it("responde el healthcheck", async () => {
        const h = await adapter.healthcheck!(AbortSignal.timeout(timeoutMs));
        expect(typeof h.ok).toBe("boolean");
        expect(h.latencyMs).toBeGreaterThanOrEqual(0);
      });
    }
  });
}
