import { expect, test, type Page } from "@playwright/test";

/** Abre resultados con una cotización compartida (sin pasar por el cuestionario). */
async function abrirResultados(page: Page, priority = "cobertura") {
  const c = Buffer.from(JSON.stringify({
    vehicle: { type: "auto", plate: "ABC123", brand: "Mazda", model: "Mazda 2", year: 2022, commercialValue: 70_000_000 },
    driver: { birthdate: "1990-05-10", city: "Medellín" },
    answers: { priority, use: "particular", parking: "cerrado", mileage: "medio", drivers: "solo", financed: false, deductibleTolerance: "bajo", services: [], claimsLast3Years: 0 },
  })).toString("base64url");
  await page.goto(`/resultados?c=${c}`);
  await expect(page.getByText("Nuestra recomendación")).toBeVisible({ timeout: 15_000 });
}

test("afina las prioridades y reordena sin volver al cuestionario", async ({ page }) => {
  await abrirResultados(page);
  // Las acciones del encabezado (Afinar, Compartir, Editar) no desbordan el celular.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByRole("button", { name: "Afinar" }).click();
  const sheet = page.getByRole("dialog", { name: "Afinar recomendación" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("slider", { name: "Precio" }).fill("100");
  await sheet.getByText("Alto", { exact: true }).click();
  await expect(sheet.getByText(/Con estos ajustes te recomendaríamos/)).toBeVisible();
  await sheet.getByRole("button", { name: "Reordenar opciones" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText(/precio 100%/)).toBeVisible();
  const recommended = page.locator("section", { hasText: "Nuestra recomendación" });
  await expect(recommended.getByText("Menor precio")).toBeVisible();
  await expect(page).toHaveURL(/\/resultados$/);
});

test("en el celular filtra desde el panel inferior", async ({ page }) => {
  await abrirResultados(page);
  await page.getByRole("button", { name: "Filtros y orden" }).click();
  const sheet = page.getByRole("dialog", { name: "Filtros y orden" });
  await sheet.getByLabel("Deducible").selectOption("0");
  await sheet.getByRole("button", { name: /^Ver \d+ opci/ }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole("button", { name: "Filtros y orden 1" })).toBeVisible();
});

test("compara apilado en el celular y oculta lo que es igual", async ({ page }) => {
  await abrirResultados(page);
  const compare = page.getByRole("button", { name: "Comparar", exact: true });
  await compare.nth(0).click();
  await compare.nth(0).click();
  await page.getByRole("button", { name: "Comparar", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "Comparación" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Opciones comparadas" }).getByRole("listitem")).toHaveCount(2);
  await expect(page.getByRole("table")).toBeHidden();
  await page.getByLabel("Solo diferencias").check();
  await expect(page.getByText(/Ocultamos \d+ fila/)).toBeVisible();
});

test("explica los términos en contexto y en el glosario", async ({ page }) => {
  await abrirResultados(page);
  const recommended = page.locator("section", { hasText: "Nuestra recomendación" });
  await recommended.getByRole("button", { name: "Deducible" }).click();
  await expect(recommended.getByRole("note")).toContainText("La parte de una pérdida que pagas tú");
  await page.keyboard.press("Escape");
  await expect(recommended.getByRole("note")).toBeHidden();
  await page.goto("/glosario");
  await expect(page.getByRole("heading", { name: "Glosario" })).toBeVisible();
  await expect(page.getByText("Responsabilidad civil (RC)")).toBeVisible();
});
