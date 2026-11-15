import { beforeEach, describe, expect, it } from "vitest";
import { campaignsFor } from "./queries";
import { db, getOrCreateUser } from "./db";
import { companyCampaigns, companyFunnel, findCompanyBySlug, inviteEmployees, joinCompany, sendCloseReminders } from "./companies";

beforeEach(() => {
  (globalThis as { __safDb?: unknown }).__safDb = undefined;
});

const andina = () => findCompanyBySlug("andina-logistica")!;
const reminders = () => db().outbox.filter((o) => /cierra/.test(o.subject));

describe("recordatorio antes del cierre", () => {
  it("se envía una sola vez, desde 3 días antes, a quien no eligió plan y a los invitados", () => {
    andina().enrollmentClosesAt = "2026-12-05";
    expect(sendCloseReminders("2026-12-01")).toEqual({ sent: 0 });
    // 18 aprobados y 2 pendientes sin plan, 2 invitados.
    expect(sendCloseReminders("2026-12-02")).toEqual({ sent: 22 });
    expect(sendCloseReminders("2026-12-03")).toEqual({ sent: 0 });
    expect(reminders().find((o) => o.to === "empleado21@andina-demo.co")?.subject).toMatch(/cierra en 3 días/);
    expect(reminders().find((o) => o.to === "empleado1@andina-demo.co")?.body).toMatch(/faltan|Si se inscriben 7 personas más, el descuento sube al 8 %/);
  });

  it("un periodo nuevo vuelve a recordar; una inscripción cerrada no", () => {
    andina().enrollmentClosesAt = "2026-12-05";
    sendCloseReminders("2026-12-04");
    andina().enrollmentClosesAt = "2027-06-30";
    expect(sendCloseReminders("2027-06-29").sent).toBeGreaterThan(0);
    andina().lockedTier = { discountPct: 5, enrolled: 18, closedAt: "", periodEnd: "2027-06-30" };
    andina().closeReminderSentFor = undefined;
    expect(sendCloseReminders("2027-06-29")).toEqual({ sent: 0 });
  });
});

describe("anuncios de la empresa", () => {
  it("solo los ven sus empleados vinculados", () => {
    db().campaigns.set("emp", { id: "emp", sponsor: "Andina", title: "Taller aliado con 20 % menos", body: "Solo para el equipo.", ctaLabel: "Ver", ctaUrl: "/ayuda", audience: "todos", companyId: "demo-andina", active: true, createdAt: "" });
    const empleado = getOrCreateUser("ana@andina-demo.co");
    empleado.marketingConsent = true;
    joinCompany(andina(), empleado);
    const otro = getOrCreateUser("luis@example.com");
    otro.marketingConsent = true;
    expect(campaignsFor(empleado).map((c) => c.id)).toContain("emp");
    expect(campaignsFor(otro).map((c) => c.id)).not.toContain("emp");
    expect(companyCampaigns("demo-andina").map((c) => c.id)).toEqual(["c-andina-1", "emp"]);
  });
});

describe("embudo de la empresa", () => {
  it("cuenta de la invitación a la póliza confirmada", () => {
    inviteEmployees(andina(), [{ email: "nuevo@andina-demo.co" }], "rrhh");
    expect(companyFunnel("demo-andina")).toMatchObject({ approved: 18, pending: 2, chose: 0, confirmed: 0 });
    expect(companyFunnel("demo-andina").invited).toBeGreaterThanOrEqual(1);
  });
});
