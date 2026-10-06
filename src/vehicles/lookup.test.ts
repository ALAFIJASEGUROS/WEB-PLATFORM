import { describe, expect, it } from "vitest";
import { lookupPlate } from "./lookup";

describe("lookupPlate", () => {
  it("resuelve cualquier placa válida de carro o moto", () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < 2000; i++) {
      const l = [0, 1, 2].map((k) => letters[(i * 7 + k * 11) % 26]).join("");
      const n = String(i % 1000).padStart(3, "0");
      const auto = lookupPlate(`${l}${n}`);
      const moto = lookupPlate(`${l}${n.slice(0, 2)}${letters[i % 26]}`);
      expect(auto?.type).toBe("auto");
      expect(moto?.type).toBe("moto");
      expect(auto?.model).toBeTruthy();
      expect(moto?.model).toBeTruthy();
    }
    expect(lookupPlate("KLM45B")?.type).toBe("moto");
  });

  it("rechaza formatos inválidos", () => {
    expect(lookupPlate("AB1234")).toBeNull();
  });
});
