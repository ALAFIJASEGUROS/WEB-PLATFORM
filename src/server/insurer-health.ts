import "server-only";
import { isCompatibleContract, type HealthStatus } from "@/insurers/adapter";
import { INSURERS } from "@/insurers/active";
import { healthOf, type InsurerHealthRow } from "@/insurers/resilience";

/** Estado de cada aseguradora: circuito, métricas de esta instancia y una sonda en vivo. */
export async function insurerHealthReport(probeTimeoutMs = 3000): Promise<InsurerHealthRow[]> {
  return Promise.all(
    INSURERS.map(async (a) => {
      let probe: HealthStatus | undefined;
      if (a.healthcheck) {
        probe = await a
          .healthcheck(AbortSignal.timeout(probeTimeoutMs))
          .catch((e) => ({ ok: false, latencyMs: probeTimeoutMs, detail: e instanceof Error ? e.message : String(e) }));
      }
      return {
        id: a.id,
        name: a.name,
        simulated: a.regulatory.contractModel === "simulado",
        contractVersion: a.contractVersion,
        contractOk: isCompatibleContract(a.contractVersion),
        capabilities: a.capabilities,
        metrics: healthOf(a.id),
        probe,
      };
    }),
  );
}
