import { expect, test, type Page } from "@playwright/test";

async function abrirResultados(page: Page) {
  const c = Buffer.from(JSON.stringify({
    vehicle: { type: "auto", plate: "ABC123", brand: "Mazda", model: "Mazda 2", year: 2022, commercialValue: 70_000_000 },
    driver: { birthdate: "1990-05-10", city: "Medellín" },
    answers: { priority: "equilibrio", use: "particular", parking: "cerrado", mileage: "medio", drivers: "solo", financed: false, deductibleTolerance: "medio", services: [], claimsLast3Years: 0 },
  })).toString("base64url");
  await page.goto(`/resultados?c=${c}`);
  await expect(page.getByText("Nuestra recomendación")).toBeVisible({ timeout: 15_000 });
}

async function entrarAlAdmin(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Correo electrónico").fill("admin@e2e.test");
  await page.getByRole("button", { name: "Enviarme el código" }).click();
  await page.getByLabel("Código").fill(await page.locator("strong.tracking-widest").innerText());
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Administración" })).toBeVisible();
}

test("calculadoras: precio de referencia y deducible", async ({ page }) => {
  await page.goto("/calculadoras/precio");
  await expect(page.getByText(/^\$\s?[\d.]+ a \$\s?[\d.]+$/)).toBeVisible();
  await page.getByText("Moto", { exact: true }).click();
  await expect(page.getByLabel("Marca")).toHaveValue("Yamaha");
  await page.goto("/calculadoras/deducible");
  await page.getByLabel("Costo de la reparación").fill("500000");
  await expect(page.getByText("no te conviene reclamar")).toBeVisible();
  await page.goto("/calculadoras/todo-riesgo");
  await page.getByLabel("Está financiado (tiene crédito o prenda)").check();
  await expect(page.getByRole("heading", { name: "Todo riesgo", exact: true })).toBeVisible();
});

test("página por marca y línea lleva al cuestionario con el vehículo elegido", async ({ page }) => {
  await page.goto("/seguros/carro");
  await page.getByRole("link", { name: /^Mazda 2/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Seguro para Mazda 2" })).toBeVisible();
  await expect(page.getByRole("table").first()).toBeVisible();
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld["@type"]).toBe("FAQPage");
  await page.getByRole("link", { name: "Ver mi precio exacto" }).click();
  await expect(page).toHaveURL(/\/cotizar\/auto\?marca=Mazda&modelo=Mazda%202/);
  await expect(page.getByLabel("Marca")).toHaveValue("Mazda");
  await expect(page.getByLabel("Línea")).toHaveValue("Mazda 2");
});

test("la oferta muestra la calificación de la aseguradora", async ({ page }) => {
  await abrirResultados(page);
  const rec = page.locator("section", { hasText: "Nuestra recomendación" });
  await rec.getByRole("link", { name: /de 5 en servicio/ }).click();
  await expect(page.getByRole("heading", { name: "Calificación de las aseguradoras" })).toBeVisible();
  await expect(page.getByText("Datos simulados con fines de demostración")).toBeVisible();
});

test("pide que lo llamen y el admin lo ve como oportunidad", async ({ page }) => {
  await abrirResultados(page);
  await page.getByRole("button", { name: "Que me llamen" }).click();
  const sheet = page.getByRole("dialog", { name: "Te llamamos" });
  await sheet.getByLabel("Nombre").fill("Marta Prueba");
  await sheet.getByLabel("Celular").fill("310 555 1234");
  await sheet.getByRole("button", { name: "Pedir la llamada" }).click();
  await expect(sheet.getByRole("alert")).toContainText("autorización");
  await sheet.getByRole("checkbox").check();
  await sheet.getByRole("button", { name: "Pedir la llamada" }).click();
  await expect(sheet.getByRole("status")).toContainText("Un asesor te llamará");
  await sheet.getByRole("button", { name: "Volver a mis opciones" }).click();

  await page.getByRole("button", { name: "Envíamela al correo" }).click();
  const save = page.getByRole("dialog", { name: "Guarda tu cotización" });
  await save.getByLabel("Correo", { exact: true }).fill("marta@ejemplo.com");
  await save.getByRole("checkbox").check();
  await save.getByRole("button", { name: "Enviar mi cotización" }).click();
  await expect(save.getByRole("status")).toContainText("Te la enviamos");

  await entrarAlAdmin(page);
  // El enlace largo del correo de la cotización guardada no debe desbordar el panel en el celular.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  const leads = page.locator("section", { has: page.getByRole("heading", { name: "Oportunidades" }) });
  await expect(leads.getByText("Marta Prueba")).toBeVisible();
  await expect(leads.getByText("3105551234")).toBeVisible();
  const form = leads.locator("form", { has: page.getByLabel("Estado de Marta Prueba") });
  await form.getByLabel("Estado de Marta Prueba").selectOption("contactada");
  await form.getByRole("button", { name: "Guardar" }).click();
  await expect(form.getByText("Oportunidad actualizada.")).toBeVisible();
});

test("un enlace de invitación avisa del descuento y limpia la URL", async ({ page }) => {
  await page.goto("/?ref=abc234");
  await expect(page.getByText("Te invitaron a SeguAlaFija")).toBeVisible();
  await expect(page).not.toHaveURL(/ref=/);
  expect(await page.evaluate(() => localStorage.getItem("saf:ref"))).toContain("ABC234");
});

test("cotiza una flota y pide la propuesta", async ({ page }) => {
  await page.goto("/flotas");
  await page.getByLabel("Placas de tus vehículos").fill("ABC123, XYZ12A\nabc-123 HOLA");
  await expect(page.getByText("No reconocemos: HOLA")).toBeVisible();
  await page.getByRole("button", { name: "Cotizar 2 vehículos" }).click();
  const table = page.getByRole("table", { name: "Mejor opción por vehículo" });
  await expect(table.getByRole("row")).toHaveCount(3, { timeout: 20_000 });
  await expect(page.getByText("Total estimado al año")).toBeVisible();
  await page.getByLabel("Empresa").fill("Mensajería Prueba SAS");
  await page.getByLabel("Tu nombre").fill("Luis Prueba");
  await page.getByLabel("Celular").fill("3001112233");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Pedir la propuesta" }).click();
  await expect(page.getByText("Recibimos tu solicitud")).toBeVisible();
});
