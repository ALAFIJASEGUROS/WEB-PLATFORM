import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("CSV", () => {
  it("usa ; con BOM, escapa comillas y saltos, y neutraliza fórmulas", () => {
    const csv = toCsv([{ a: 'Dijo "hola"; adiós', b: 12.5, c: "=HYPERLINK(1)", d: -300 }]);
    expect(csv.startsWith("﻿a;b;c;d\r\n")).toBe(true);
    expect(csv).toContain('"Dijo ""hola""; adiós";12.5;\'=HYPERLINK(1);-300');
  });
});
