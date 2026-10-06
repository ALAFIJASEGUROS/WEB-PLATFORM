import { expect, test, type Page } from "@playwright/test";

async function cotizar(page: Page, opts: { weights?: boolean } = {}) {
  await page.goto("/cotizar/auto");
  await page.getByLabel("Placa de tu carro").fill("ABC123");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("Encontramos tu carro")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Fecha de nacimiento").fill("1990-05-10");
  await page.getByLabel("Ciudad donde circula").selectOption("Medellín");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  if (opts.weights) {
    await page.getByLabel("Ajustar los pesos a mi medida").check();
    await page.getByRole("slider", { name: "Precio" }).fill("100");
  }
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Ver mis opciones" }).click();
  await expect(page.getByText("Nuestra recomendación")).toBeVisible({ timeout: 15_000 });
}

test("cotiza, compra sin cuenta, recibe la póliza y la guarda en su cuenta", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  await cotizar(page);

  await page.getByRole("link", { name: "Lo quiero" }).first().click();
  await page.getByLabel("Nombres").fill("Ana");
  await page.getByLabel("Apellidos").fill("Gómez");
  await page.getByLabel("Número de documento").fill("1020304050");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Celular").fill("3001234567");
  await page.getByLabel("Dirección").fill("Calle 10 # 43-21");
  await page.getByText("Leí y acepto").click();
  await page.getByText("Autorizo el tratamiento").click();
  await page.getByRole("button", { name: /^Pagar/ }).filter({ visible: true }).first().click();

  await page.getByRole("button", { name: "Simular pago aprobado" }).click();
  await expect(page.getByRole("heading", { name: "¡Listo, ya estás asegurado!" })).toBeVisible();
  await page.getByRole("link", { name: "Ver mi póliza" }).click();
  await expect(page.getByText("Número de póliza", { exact: true })).toBeVisible();
  await expect(page.getByText(/Derecho de retracto/).first()).toBeVisible();

  await page.goto(`/cuenta?email=${encodeURIComponent(email)}`);
  await page.getByRole("button", { name: "Enviarme el código" }).click();
  const code = await page.locator("strong.tracking-widest").innerText();
  await page.getByLabel("Código").fill(code);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Hola, Ana" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Mi cuenta/ })).toContainText("Ana");

  await page.goto("/cuenta/seguros");
  await expect(page.getByText("Vigente")).toBeVisible();
});

test("con 100% al precio recomienda la opción más barata", async ({ page }) => {
  await cotizar(page, { weights: true });
  await expect(page.getByText(/precio 100%/)).toBeVisible();
  const recommended = page.locator("section", { hasText: "Nuestra recomendación" });
  await expect(recommended.getByText("Menor precio")).toBeVisible();
});

test("el condicionado está disponible desde la oferta", async ({ page }) => {
  await page.goto("/condicionado/sura/auto-clasico");
  await expect(page.getByRole("heading", { name: "Exclusiones principales" })).toBeVisible();
});
