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

  await page.getByRole("link", { name: /^(Lo quiero|Comprar por)/ }).first().click();
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
  await page.getByRole("link", { name: /Tuviste un choque o un hurto/ }).click();
  await expect(page.getByRole("heading", { name: "Si tuviste un choque" })).toBeVisible();
  await page.goBack();

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

test("es instalable y muestra una página sin conexión", async ({ page, context }) => {
  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  expect(manifest.icons.map((i: { sizes: string; purpose?: string }) => `${i.sizes}${i.purpose ? `:${i.purpose}` : ""}`)).toEqual(
    expect.arrayContaining(["192x192", "512x512", "512x512:maskable"]),
  );
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.goto("/ayuda").catch(() => {});
  await expect(page.getByRole("heading", { name: "Estás sin conexión" })).toBeVisible();
  await context.setOffline(false);
});

test("muestra los descuentos y el admin puede apagarlos", async ({ page }) => {
  await cotizar(page);
  await expect(page.getByText("Tarifa digital SURA").first()).toBeVisible();

  await page.goto("/admin");
  await page.getByLabel("Correo electrónico").fill("admin@e2e.test");
  await page.getByRole("button", { name: "Enviarme el código" }).click();
  await page.getByLabel("Código").fill(await page.locator("strong.tracking-widest").innerText());
  await page.getByRole("button", { name: "Entrar" }).click();
  const panel = page.locator("section", { has: page.getByRole("heading", { name: "Descuentos y tarifas especiales" }) });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { name: "Impacto en la conversión" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Experimentos A/B" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Detener" })).toBeVisible();
  await panel.getByLabel("Descuentos activos (interruptor general)").uncheck();
  await panel.getByRole("button", { name: "Guardar configuración" }).click();
  await expect(panel.getByText("Apagados", { exact: true })).toBeVisible();

  await cotizar(page);
  await expect(page.getByText("Tarifa digital SURA")).toHaveCount(0);

  // Deja la configuración como estaba para las demás pruebas.
  await page.goto("/admin");
  await panel.getByLabel("Descuentos activos (interruptor general)").check();
  await panel.getByRole("button", { name: "Guardar configuración" }).click();
  await expect(panel.getByText(/Activos · tope/)).toBeVisible();
});

test("registra una póliza externa leyendo su PDF", async ({ page, browser }) => {
  // PDF con texto, generado al vuelo con Chromium.
  const maker = await browser.newPage();
  await maker.setContent(`<main style="font-family:sans-serif">
    <h1>SEGUROS BOLÍVAR S.A.</h1><p>Póliza No.: AU-1020-55871</p><p>Producto: Auto Plus</p>
    <p>Placa: PDF123</p><p>Vigencia desde el 15/03/2026 hasta el 15/03/2027</p><p>Prima total: $1.250.000</p></main>`);
  const pdf = await maker.pdf();
  await maker.close();

  const email = `pdf-${Date.now()}@example.com`;
  await page.goto(`/cuenta?email=${encodeURIComponent(email)}`);
  await page.getByRole("button", { name: "Enviarme el código" }).click();
  await page.getByLabel("Código").fill(await page.locator("strong.tracking-widest").innerText());
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /^Hola/ })).toBeVisible();
  await page.goto("/cuenta/seguros");

  await page.getByText("+ Agregar vehículo").click();
  await page.getByLabel("Placa").fill("PDF123");
  await page.getByLabel("Marca").fill("Mazda");
  await page.getByLabel("Línea").fill("Mazda 2");
  await page.getByLabel("Año").fill("2022");
  await page.getByRole("button", { name: "Agregar vehículo" }).click();

  await page.getByText("+ Registrar una póliza que ya tengo").click();
  await page.getByLabel(/Llenar desde el PDF/).setInputFiles({ name: "poliza.pdf", mimeType: "application/pdf", buffer: pdf });
  await expect(page.getByText(/Encontramos: .*número/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel("Número de póliza")).toHaveValue("AU-1020-55871");
  await expect(page.getByLabel("Aseguradora")).toHaveValue("Seguros Bolívar");
  await expect(page.getByLabel("Fin de vigencia")).toHaveValue("2027-03-15");
  await page.getByRole("button", { name: "Registrar póliza" }).click();
  await expect(page.getByText("AU-1020-55871").first()).toBeVisible();
});

test("desde la portada, la placa lleva directo al vehículo encontrado", async ({ page }) => {
  const { UI_EXPERIMENTS, assignVariantOf } = await import("../src/recommendation/experiments");
  const exp = UI_EXPERIMENTS.find((e) => e.id === "portada-cta-1")!;
  // Una sesión que cae en la variante "placa".
  let sid = "";
  for (let i = 0; assignVariantOf(exp, sid).id !== "placa"; i++) sid = `e2e-${i}`;
  await page.addInitScript((s) => sessionStorage.setItem("saf:sid", s), sid);

  await page.goto("/");
  await expect(page.getByRole("link", { name: /Carro\s*Ver mis precios/ })).toBeHidden();
  await page.getByLabel("Escribe tu placa").fill("ABC123");
  await page.getByRole("button", { name: "Ver mis precios" }).click();
  await expect(page).toHaveURL(/\/cotizar\/auto\?placa=ABC123/);
  await expect(page.getByText("Encontramos tu carro")).toBeVisible();
});
