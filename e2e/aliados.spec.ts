import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Enviarme el código" }).click();
  await page.getByLabel("Código").fill(await page.locator("strong.tracking-widest").innerText());
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("la aseguradora propone una campaña, SeguAlaFija la aprueba y queda publicada", async ({ page, browser }) => {
  const title = `Revisión de frenos ${Date.now()}`;
  await page.goto("/aliados");
  await login(page, "aliado@bolivar-demo.co");
  await expect(page.getByRole("heading", { name: "Seguros Bolívar" })).toBeVisible();
  await expect(page.getByText("Eligieron una oferta tuya")).toBeVisible();

  await page.getByLabel("Título").fill(title);
  await page.getByLabel("Mensaje").fill("Para clientes con póliza de autos, sin costo.");
  await page.getByLabel("Texto del botón").fill("Agendar");
  await page.getByLabel("Enlace").fill("/ayuda");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText(/Enviamos tu campaña a revisión/)).toBeVisible();
  const card = page.locator("div", { has: page.getByText(title, { exact: true }) }).filter({ hasText: "En revisión de SeguAlaFija" }).last();
  await expect(card).toBeVisible();

  // SeguAlaFija la revisa y la activa desde /admin.
  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/admin");
  await login(admin, "admin@e2e.test");
  const row = (button: string) =>
    admin.locator("div").filter({ has: admin.getByText(title, { exact: true }) }).filter({ has: admin.getByRole("button", { name: button }) }).last();
  await expect(row("Activar")).toContainText("Creada por la aseguradora");
  await row("Activar").getByRole("button", { name: "Activar" }).click();
  await expect(row("Pausar")).toBeVisible();

  await page.reload();
  await expect(page.locator("div", { has: page.getByText(title, { exact: true }) }).filter({ hasText: "Publicada" }).last()).toBeVisible();
});

test("una cuenta sin acceso no ve el portal", async ({ page }) => {
  await page.goto("/aliados");
  await login(page, `nadie-${Date.now()}@example.com`);
  await expect(page.getByText("Sin acceso")).toBeVisible();
});
