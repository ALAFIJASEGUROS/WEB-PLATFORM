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
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Revisa tus respuestas" })).toBeVisible();
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
  // Preguntas SARLAFT: dependen de la aseguradora elegida.
  const kyc = page.getByRole("region", { name: "Conocimiento del cliente" });
  for (const select of await kyc.locator("select").all()) await select.selectOption({ index: 1 });
  for (const no of await kyc.getByText("No", { exact: true }).all()) await no.click();
  await page.getByText("Leí y acepto").click();
  await page.getByText("Autorizo el tratamiento").click();
  await page.getByRole("button", { name: /^Pagar/ }).filter({ visible: true }).first().click();

  const dialog = page.getByRole("dialog", { name: "Confirma tu compra" });
  await expect(dialog).toBeVisible();
  const acceptanceCode = await dialog.locator("strong.tracking-widest").innerText();
  await dialog.getByLabel("Código de aceptación").fill(acceptanceCode);
  await dialog.getByRole("button", { name: "Aceptar y pagar" }).click();

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

test("edita una respuesta desde el resumen y descarta los planes que no aplican", async ({ page }) => {
  await page.goto("/cotizar/moto");
  await page.getByLabel("Placa de tu moto").fill("ABC12D");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("Encontramos tu moto")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Fecha de nacimiento").fill("1995-03-03");
  await page.getByLabel("Ciudad donde circula").selectOption("Cali");
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("button", { name: "Editar uso" }).click();
  await page.getByText("Domicilios o plataformas").click();
  await page.getByRole("button", { name: "Guardar y volver al resumen" }).click();
  await expect(page.getByText("En domicilios o plataformas", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ver mis opciones" }).click();

  await expect(page.getByText("Nuestra recomendación")).toBeVisible({ timeout: 15_000 });
  await page.getByText(/planes no aplican para tu caso/).click();
  await expect(page.getByText(/No cubre el uso en domicilios o plataformas/).first()).toBeVisible();
});

test("el condicionado está disponible desde la oferta", async ({ page }) => {
  await page.goto("/condicionado/sura/auto-clasico");
  await expect(page.getByRole("heading", { name: "Exclusiones principales" })).toBeVisible();
});

test("abre una cotización compartida por enlace", async ({ page }) => {
  // Mismo formato que src/lib/share.ts: JSON en base64url.
  const c = Buffer.from(JSON.stringify({
    vehicle: { type: "moto", plate: "XYZ12A", brand: "Yamaha", model: "NMAX 155", year: 2023, commercialValue: 13_000_000 },
    driver: { birthdate: "1995-03-03", city: "Cali" },
    answers: { priority: "precio", use: "domicilios", parking: "calle", mileage: "alto", drivers: "solo", financed: false, deductibleTolerance: "alto", services: [], claimsLast3Years: 0 },
  })).toString("base64url");
  await page.goto(`/resultados?c=${c}`);
  await expect(page.getByRole("heading", { name: /opciones para tu Yamaha NMAX 155 2023/ })).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/\/resultados$/);
});

test("el footer muestra la versión desplegada", async ({ page }) => {
  const { readFileSync } = await import("node:fs");
  const { version } = JSON.parse(readFileSync("package.json", "utf8"));
  await page.goto("/");
  await expect(page.getByTestId("app-version")).toHaveText(`v${version}`);
});
