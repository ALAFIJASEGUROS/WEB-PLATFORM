import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Enviarme el código" }).click();
  await page.getByLabel("Código").fill(await page.locator("strong.tracking-widest").innerText());
  await page.getByRole("button", { name: "Entrar" }).click();
}

async function quoteCar(page: Page) {
  await page.getByLabel("Placa de tu carro").fill("ABC123");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("Encontramos tu carro")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Fecha de nacimiento").fill("1990-05-10");
  await page.getByLabel("Ciudad donde circula").selectOption("Medellín");
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Ver mis opciones" }).click();
}

test("el empleado se une con su correo, cotiza con la tarifa de su empresa y elige su plan", async ({ page }) => {
  const email = `ana-${Date.now()}@andina-demo.co`;
  await page.goto("/empresas/andina-logistica");
  await expect(page.getByRole("heading", { name: "Andina Logística (demo)" })).toBeVisible();
  await login(page, email);

  await expect(page).toHaveURL(/\/empresas\/andina-logistica$/);
  await page.getByRole("button", { name: "Unirme" }).click();
  await expect(page.getByText("Pendiente de aprobación")).toBeVisible();

  await page.getByRole("link", { name: "Cotizar mi carro" }).click();
  await expect(page.getByText("Tarifa de tu empresa")).toBeVisible();
  await quoteCar(page);

  await expect(page.getByText(/Tarifa corporativa de Andina Logística \(demo\): 5 % de descuento/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Tarifa corporativa Andina Logística (demo)").first()).toBeVisible();
  // Solo los planes que habilitó la empresa (Auto Esencial y Auto Plus).
  await expect(page.getByRole("heading", { name: /opciones para tu/ })).toHaveText(/^2 opciones/);
  await page.getByRole("button", { name: "Elegir este plan" }).first().click();

  await expect(page).toHaveURL(/\/empresas\/andina-logistica\?eleccion=ok/);
  await expect(page.getByText("Guardamos tu elección")).toBeVisible();
  await expect(page.getByText(/Tu plan elegido: Auto (Plus|Esencial)/)).toBeVisible();

  await page.goto("/cuenta");
  await expect(page.getByRole("heading", { name: "Beneficio de Andina Logística (demo)" })).toBeVisible();
});

test("con un correo personal pide el código de la empresa", async ({ page }) => {
  await page.goto("/empresas/andina-logistica?codigo=ANDINA7K2P");
  await login(page, `luis-${Date.now()}@example.com`);
  await expect(page.getByLabel("Código de tu empresa")).toHaveValue("ANDINA7K2P");
  await page.getByLabel("Código de tu empresa").fill("MALO");
  await page.getByRole("button", { name: "Unirme" }).click();
  await expect(page.getByText(/El código no es correcto/)).toBeVisible();
  await page.getByLabel("Código de tu empresa").fill("andina7k2p");
  await page.getByRole("button", { name: "Unirme" }).click();
  await expect(page.getByText("Pendiente de aprobación")).toBeVisible();
});

test("la cotización individual no se mezcla con la de la empresa", async ({ page }) => {
  await page.goto("/cotizar/auto");
  await expect(page.getByText("Tarifa de tu empresa")).toHaveCount(0);
});
