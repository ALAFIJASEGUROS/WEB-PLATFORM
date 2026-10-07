import { describe, expect, it } from "vitest";
import { findDates, parsePolicyText } from "./policy-pdf";

const SAMPLE = `
  SEGUROS BOLÍVAR S.A.        NIT 860.002.503-2
  CARÁTULA DE PÓLIZA DE AUTOMÓVILES
  Póliza No.: AU-1020-55871        Producto: Auto Plus
  Tomador: ANA GÓMEZ   CC 1020304050
  Vehículo: MAZDA 2 2022   Placa: abc-123
  Vigencia desde el 15/03/2026 hasta el 15/03/2027
  Prima: $1.050.420   IVA: $199.580   Prima total: $1.250.000,00
`;

describe("lectura de pólizas en PDF", () => {
  it("extrae aseguradora, número, plan, vigencia, placa y prima", () => {
    expect(parsePolicyText(SAMPLE)).toEqual({
      insurerName: "Seguros Bolívar",
      number: "AU-1020-55871",
      planName: "Auto Plus",
      startDate: "2026-03-15",
      endDate: "2027-03-15",
      plate: "ABC123",
      annualPremium: 1_250_000,
    });
  });

  it("entiende fechas en texto y placas de moto", () => {
    const p = parsePolicyText("Mapfre. Póliza número 99887766. Vehículo placa XYZ12A. Vigencia: 1 de octubre de 2026 a 1 de octubre de 2027.");
    expect(p).toMatchObject({ insurerName: "Mapfre", number: "99887766", plate: "XYZ12A", startDate: "2026-10-01", endDate: "2027-10-01" });
  });

  it("no inventa datos que no están", () => {
    expect(parsePolicyText("Documento sin datos de póliza")).toEqual({});
    expect(parsePolicyText("NIT 860.002.503 IVA 190 vehículo ABC 123").plate).toBe("ABC123");
    expect(findDates("31/02/2026 y 2026-13-01")).toEqual([]);
  });
});
