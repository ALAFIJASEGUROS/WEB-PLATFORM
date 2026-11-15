import { beforeEach, describe, expect, it } from "vitest";
import { campaignsFor } from "./queries";
import { recordEvent } from "./analytics";
import { db, getOrCreateUser } from "./db";
import { insurerCampaigns, insurerMetrics, insurerPortalUsers, proposeCampaign, toggleInsurerCampaign } from "./insurer-portal";

beforeEach(() => {
  (globalThis as { __safDb?: unknown }).__safDb = undefined;
  (globalThis as { __safEvents?: unknown }).__safEvents = undefined;
});

const input = { title: "Revisión de frenos gratis", body: "Para clientes con póliza de autos.", ctaLabel: "Agendar", ctaUrl: "https://example.com", audience: "auto" as const };

describe("portal de aseguradoras", () => {
  it("lee los usuarios y descarta aseguradoras que no están activas", () => {
    expect([...insurerPortalUsers("Ana@Bolivar.co:bolivar, x@sura.co:sura, mal")]).toEqual([["ana@bolivar.co", "bolivar"]]);
  });

  it("la campaña propuesta queda en revisión, no se publica y no se puede activar desde el portal", () => {
    const c = proposeCampaign("bolivar", "Seguros Bolívar", input);
    expect(c).toMatchObject({ active: false, createdBy: "aseguradora", sponsor: "Seguros Bolívar" });
    expect(insurerCampaigns("bolivar").find((x) => x.id === c.id)?.status).toBe("en_revision");
    expect(toggleInsurerCampaign("bolivar", c.id)).toBeNull();
    const user = getOrCreateUser("ana@example.com");
    user.marketingConsent = true;
    expect(campaignsFor(user).map((x) => x.id)).not.toContain(c.id);
  });

  it("aprobada por SeguAlaFija, la aseguradora la puede pausar y ve sus clics", () => {
    const c = proposeCampaign("bolivar", "Seguros Bolívar", input);
    Object.assign(db().campaigns.get(c.id)!, { active: true, reviewedAt: "2026-11-15" });
    recordEvent("campana_clic", "s1", { campana: c.id });
    recordEvent("campana_clic", "s2", { campana: c.id });
    expect(insurerCampaigns("bolivar").find((x) => x.id === c.id)).toMatchObject({ status: "activa", clicks: 2 });
    expect(toggleInsurerCampaign("bolivar", c.id)?.active).toBe(false);
    expect(toggleInsurerCampaign("otra", c.id)).toBeNull();
  });

  it("calcula métricas de elección a pago sin datos personales", () => {
    recordEvent("resultados_vistos", "s1");
    recordEvent("resultados_vistos", "s2");
    recordEvent("oferta_elegida", "s1", { aseguradora: "bolivar" });
    const m = insurerMetrics("bolivar");
    expect(m).toMatchObject({ resultsViewed: 2, chosen: 1, paid: 0, policies: 0, conversion: 0 });
    expect(JSON.stringify(m)).not.toMatch(/@|documentNumber/);
  });
});
