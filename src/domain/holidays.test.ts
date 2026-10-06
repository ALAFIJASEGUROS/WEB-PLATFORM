import { describe, expect, it } from "vitest";
import { addBusinessDays, colombianHolidays, easterSunday, isBusinessDay } from "./holidays";

describe("festivos de Colombia", () => {
  it("calcula la Pascua", () => {
    expect(easterSunday(2026).toISOString().slice(0, 10)).toBe("2026-04-05");
    expect(easterSunday(2025).toISOString().slice(0, 10)).toBe("2025-04-20");
  });

  it("incluye festivos fijos, trasladados y de Semana Santa (2026)", () => {
    const h = colombianHolidays(2026);
    for (const d of ["2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03", "2026-05-18", "2026-06-08", "2026-06-15", "2026-06-29", "2026-07-20", "2026-08-07", "2026-08-17", "2026-10-12", "2026-11-02", "2026-11-16", "2026-12-08", "2026-12-25"]) {
      expect(h.has(d), d).toBe(true);
    }
    expect(h.size).toBe(18);
  });

  it("suma días hábiles saltando fines de semana y festivos", () => {
    expect(isBusinessDay("2026-10-12")).toBe(false); // Día de la Raza
    expect(addBusinessDays("2026-10-08", 5)).toBe("2026-10-16"); // salta 10, 11 y 12
  });
});
