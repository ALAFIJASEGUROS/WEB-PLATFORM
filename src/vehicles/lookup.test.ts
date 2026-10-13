import { describe, expect, it } from "vitest";
import { lookupPlate } from "./lookup";
import { findModelPage, modelPages, slugify } from "./pages";

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

describe("páginas por marca y línea", () => {
  it("genera slugs limpios y únicos", () => {
    expect(slugify("Mazda 2")).toBe("mazda-2");
    expect(slugify("NMAX 155")).toBe("nmax-155");
    const paths = modelPages().map((p) => `${p.tipo}/${p.marca}/${p.modelo}`);
    expect(new Set(paths).size).toBe(paths.length);
  });
  it("encuentra una página por sus slugs", () => {
    expect(findModelPage("carro", "mazda", "mazda-2")?.model).toBe("Mazda 2");
    expect(findModelPage("moto", "mazda", "mazda-2")).toBeNull();
  });
});
