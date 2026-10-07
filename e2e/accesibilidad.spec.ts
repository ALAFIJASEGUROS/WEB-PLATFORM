import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function audit(page: Page, name: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = serious.map((v) => `${v.id}: ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(summary, `Violaciones en ${name}`).toEqual([]);
}

const PAGES = ["/", "/cotizar", "/cotizar/auto", "/como-funciona", "/ayuda", "/siniestros", "/pqr", "/cuenta", "/condicionado/sura/auto-global", "/legal/privacidad"];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`accesibilidad (${scheme})`, () => {
    // Sin animaciones, axe mide los colores finales y no los de la transición.
    test.use({ colorScheme: scheme, reducedMotion: "reduce" });

    for (const path of PAGES) {
      test(`sin violaciones graves en ${path}`, async ({ page }) => {
        await page.goto(path);
        await audit(page, path);
      });
    }

    test("sin violaciones graves en resultados y checkout", async ({ page }) => {
      await page.goto("/cotizar/moto");
      await page.getByLabel("Placa de tu moto").fill("ABC12D");
      await page.getByRole("button", { name: "Buscar" }).click();
      await expect(page.getByText("Encontramos tu moto")).toBeVisible();
      await page.getByRole("button", { name: "Continuar" }).click();
      await page.getByLabel("Fecha de nacimiento").fill("1995-03-03");
      await page.getByLabel("Ciudad donde circula").selectOption("Cali");
      for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Continuar" }).click();
      await audit(page, "cuestionario");
      await page.getByRole("button", { name: "Continuar" }).click();
      await audit(page, "resumen del cuestionario");
      await page.getByRole("button", { name: "Ver mis opciones" }).click();
      await expect(page.getByText("Nuestra recomendación")).toBeVisible({ timeout: 15_000 });
      await audit(page, "/resultados");
      await page.getByRole("link", { name: /^(Lo quiero|Comprar por)/ }).first().click();
      await expect(page.getByLabel("Nombres")).toBeVisible();
      await audit(page, "/checkout");
    });
  });
}
