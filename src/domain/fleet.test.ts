import { describe, expect, it } from "vitest";
import { MAX_FLEET, parsePlates, summarizeFleet } from "./fleet";

describe("parsePlates", () => {
  it("separa por comas, espacios y líneas, y reconoce carros y motos", () => {
    const r = parsePlates("abc123, XYZ12A\nkmn-456  ");
    expect(r.plates).toEqual([
      { plate: "ABC123", type: "auto" },
      { plate: "XYZ12A", type: "moto" },
      { plate: "KMN456", type: "auto" },
    ]);
  });
  it("reporta inválidas y repetidas", () => {
    const r = parsePlates("ABC123 abc-123 12345 HOLA");
    expect(r.duplicates).toEqual(["ABC123"]);
    expect(r.invalid).toEqual(["12345", "HOLA"]);
  });
  it("limita el tamaño de la flota", () => {
    const many = Array.from({ length: MAX_FLEET + 5 }, (_, i) => `AAA${String(i).padStart(3, "0")}`).join(" ");
    const r = parsePlates(many);
    expect(r.plates).toHaveLength(MAX_FLEET);
    expect(r.tooMany).toBe(true);
  });
});

describe("summarizeFleet", () => {
  it("suma solo las placas cotizadas", () => {
    const s = summarizeFleet([
      { plate: "ABC123", vehicle: "Mazda 2", type: "auto", best: { insurerName: "SURA", planName: "Global", annualPremium: 2_000_000 } },
      { plate: "XYZ12A", vehicle: "NMAX", type: "moto", best: { insurerName: "Bolívar", planName: "Moto Plus", annualPremium: 800_000 } },
      { plate: "KMN456", vehicle: "?", type: "auto", error: "Sin respuesta" },
    ]);
    expect(s).toEqual({ vehicles: 3, quoted: 2, autos: 2, motos: 1, total: 2_800_000 });
  });
});
