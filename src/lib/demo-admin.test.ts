import { describe, expect, it } from "vitest";
import { demoAdminSnapshot } from "./demo-admin";

describe("datos simulados del panel", () => {
  const now = new Date("2026-10-13T15:00:00Z");
  const snap = demoAdminSnapshot(now);

  it("son deterministas", () => {
    expect(JSON.stringify(demoAdminSnapshot(now))).toBe(JSON.stringify(snap));
  });

  it("son coherentes entre sí", () => {
    expect(snap.salesByDay).toHaveLength(30);
    expect(snap.kpis.orders).toBe(snap.orders.length);
    expect(snap.kpis.issued).toBe(snap.orders.filter((o) => o.status === "emitida").length);
    // El embudo termina en las compras pagadas y nunca crece de un paso al siguiente.
    const sizes = snap.funnel.map((f) => f.sessions);
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1]);
    expect(snap.experiments.every((e) => e.rows.slice(1).every((r) => r.pValue !== null))).toBe(true);
    expect(snap.orders.every((o) => o.email.endsWith("@ejemplo.com"))).toBe(true);
  });
});
