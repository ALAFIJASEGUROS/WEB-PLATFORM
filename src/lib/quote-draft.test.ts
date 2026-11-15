import { describe, expect, it } from "vitest";
import { DRAFT_TTL_MS, isUsableDraft } from "./quote-draft";

const draft = {
  savedAt: 1_000_000,
  step: 2,
  vehicle: { type: "auto", brand: "Mazda", model: "Mazda 2", year: 2022, commercialValue: 70_000_000 },
  birthdate: "1990-05-10",
  city: "Medellín",
  answers: { priority: "precio" },
};

describe("borrador de cotización", () => {
  it("sirve si es del mismo tipo y no ha vencido", () => {
    expect(isUsableDraft(draft, "auto", draft.savedAt + 1000)).toBe(true);
  });
  it("vence a los 7 días", () => {
    expect(isUsableDraft(draft, "auto", draft.savedAt + DRAFT_TTL_MS)).toBe(false);
  });
  it("no se usa para otro tipo de vehículo ni si está incompleto", () => {
    expect(isUsableDraft(draft, "moto", draft.savedAt)).toBe(false);
    expect(isUsableDraft({ ...draft, vehicle: undefined }, "auto", draft.savedAt)).toBe(false);
    expect(isUsableDraft("basura", "auto", draft.savedAt)).toBe(false);
  });
});
