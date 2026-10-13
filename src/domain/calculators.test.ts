import { describe, expect, it } from "vitest";
import { coverageAdvice, deductibleSplit } from "./calculators";
import { estimatePrice } from "@/insurers/estimate";

describe("deductibleSplit", () => {
  it("usa el porcentaje cuando supera el mínimo", () => {
    expect(deductibleSplit(20_000_000, 10, 1, 1_000_000)).toMatchObject({ deductible: 2_000_000, insurerPays: 18_000_000 });
  });
  it("usa el mínimo en SMMLV cuando el porcentaje es menor", () => {
    expect(deductibleSplit(4_000_000, 10, 1, 1_000_000)).toMatchObject({ deductible: 1_000_000, insurerPays: 3_000_000, minimumApplies: true });
  });
  it("si el daño es menor que el deducible, lo pagas todo", () => {
    expect(deductibleSplit(500_000, 10, 1, 1_000_000)).toMatchObject({ deductible: 500_000, insurerPays: 0 });
  });
});

describe("coverageAdvice", () => {
  const base = { vehicleType: "auto" as const, value: 60_000_000, savings: 0, financed: false, needsItToWork: false };
  it("financiado siempre es todo riesgo", () => {
    expect(coverageAdvice({ ...base, savings: 1e9, financed: true }).advice).toBe("todo-riesgo");
  });
  it("sin ahorros recomienda todo riesgo", () => {
    expect(coverageAdvice(base).advice).toBe("todo-riesgo");
  });
  it("si puede reparar pero no reponer, RC más pérdidas totales", () => {
    expect(coverageAdvice({ ...base, savings: 20_000_000 }).advice).toBe("rc-perdidas-totales");
  });
  it("si puede reponer el carro, basta RC; en moto, sugiere cubrir el hurto", () => {
    expect(coverageAdvice({ ...base, savings: 80_000_000 }).advice).toBe("solo-rc");
    expect(coverageAdvice({ ...base, vehicleType: "moto", value: 8_000_000, savings: 10_000_000 }).advice).toBe("rc-perdidas-totales");
  });
});

describe("estimatePrice", () => {
  const input = { type: "auto" as const, brand: "Mazda", model: "Mazda 2", year: 2022, city: "Medellín", age: 35 };
  it("da un rango con todo riesgo dentro de él", () => {
    const e = estimatePrice(input)!;
    expect(e.min).toBeLessThan(e.max);
    expect(e.fullFrom).toBeGreaterThanOrEqual(e.min);
    expect(e.plans[0].annualPremium).toBe(e.min);
  });
  it("una persona joven paga más", () => {
    expect(estimatePrice({ ...input, age: 21 })!.min).toBeGreaterThan(estimatePrice(input)!.min);
  });
  it("descarta planes que no aseguran el cilindraje", () => {
    const e = estimatePrice({ type: "moto", brand: "Yamaha", model: "MT-03", year: 2024, city: "Cali", age: 30 })!;
    expect(e.plans.some((p) => p.planName === "Moto Básico")).toBe(false);
  });
  it("devuelve null para modelos que no están en el catálogo", () => {
    expect(estimatePrice({ ...input, model: "Inventado" })).toBeNull();
  });
});
