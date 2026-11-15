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
  // Anuncios de la empresa, solo para sus empleados.
  await expect(page.getByRole("heading", { name: "Más beneficios para ti" })).toBeVisible();

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

test("el admin de la empresa aprueba en lote, invita por lista y configura el programa", async ({ page }) => {
  await page.goto("/empresas/andina-logistica/admin");
  await login(page, "rrhh@andina-demo.co");
  await expect(page.getByRole("heading", { name: "Andina Logística (demo)" })).toBeVisible();
  await expect(page.getByText("rrhh@andina-demo.co · administrador")).toBeVisible();

  // Aprobar en lote todo lo pendiente.
  const bandeja = page.locator("section", { has: page.getByRole("heading", { name: "Vinculaciones por aprobar" }) });
  await bandeja.getByLabel(/Seleccionar todas/).check();
  await bandeja.getByRole("button", { name: /^Aprobar/ }).click();
  await expect(bandeja.getByText(/aprobadas?\./)).toBeVisible();
  await expect(bandeja.getByText("No hay vinculaciones pendientes.")).toBeVisible();

  // Invitar con una lista pegada (un repetido y una línea inválida).
  const correo = `nuevo-${Date.now()}@andina-demo.co`;
  await page.getByLabel("Lista de empleados").fill(`Nuevo Empleado, ${correo}\n${correo}\nsin correo`);
  await page.getByRole("button", { name: "Enviar invitaciones" }).click();
  await expect(page.getByText(/Enviamos 1 invitación\. 1 repetidos en la lista, 1 líneas sin correo válido\./)).toBeVisible();
  await expect(page.getByRole("cell", { name: "Invitado por la empresa" }).first()).toBeVisible();

  // Configurar el cierre de la inscripción.
  await page.locator("#pr-close").fill("2026-12-20");
  await page.locator("#pr-close").press("Enter");
  await expect(page.getByText("Programa actualizado.")).toBeVisible();
  await expect(page.getByText(/Actualizó el programa/)).toBeVisible();

  // Reporte para nómina.
  const csv = await page.request.get("/api/empresas/andina-logistica/reporte");
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain("Descuento mensual por nómina");
});

test("el rol de solo lectura no puede aprobar ni configurar", async ({ page }) => {
  await page.goto("/empresas/andina-logistica/admin");
  await login(page, "finanzas@andina-demo.co");
  await expect(page.getByText("finanzas@andina-demo.co · solo lectura")).toBeVisible();
  await expect(page.getByText(/Solo los administradores pueden aprobar/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar programa" })).toHaveCount(0);
});

test("un empleado sin rol no ve el panel; un invitado acepta y queda aprobado", async ({ page }) => {
  await page.goto("/empresas/andina-logistica/admin");
  await login(page, "empleado21@andina-demo.co");
  await expect(page.getByRole("heading", { name: "Sin acceso al panel" })).toBeVisible();
  await page.goto("/empresas/andina-logistica");
  await page.getByRole("button", { name: "Aceptar la invitación" }).click();
  await expect(page.getByText("Aprobado", { exact: true })).toBeVisible();
});

// Va al final del archivo: cierra la inscripción de la empresa de demostración.
test("al cerrar la inscripción el empleado confirma su plan con descuento por nómina y queda asegurado", async ({ page, browser }) => {
  const email = `cierre-${Date.now()}@andina-demo.co`;
  await page.goto("/empresas/andina-logistica");
  await login(page, email);
  await page.getByRole("button", { name: "Unirme" }).click();
  await page.getByRole("link", { name: "Cotizar mi carro" }).click();
  await quoteCar(page);
  await page.getByRole("button", { name: "Elegir este plan" }).first().click();
  await expect(page.getByText("Guardamos tu elección")).toBeVisible();

  // El admin de la empresa aprueba y cierra la inscripción.
  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/empresas/andina-logistica/admin");
  await login(admin, "rrhh@andina-demo.co");
  const bandeja = admin.locator("section", { has: admin.getByRole("heading", { name: "Vinculaciones por aprobar" }) });
  await bandeja.getByLabel(/Seleccionar todas/).check();
  await bandeja.getByRole("button", { name: /^Aprobar/ }).click();
  await expect(bandeja.getByText("No hay vinculaciones pendientes.")).toBeVisible();
  await admin.locator("#pr-close").fill("2026-12-20");
  await admin.locator("#pr-close").blur();
  await admin.getByRole("button", { name: "Guardar programa" }).click();
  await expect(admin.getByText("Programa actualizado.")).toBeVisible();
  await admin.getByRole("button", { name: "Cerrar la inscripción ahora" }).click();
  await expect(admin.getByRole("region", { name: "Cierre de la inscripción" })).toContainText(/Cerró el .* con \d+ inscritos/);

  // El empleado confirma con el precio final y paga su parte por nómina.
  await page.reload();
  await expect(page.getByText(/La inscripción cerró el/)).toBeVisible();
  await page.getByRole("button", { name: /^Confirmar y pagar/ }).click();
  await expect(page.getByRole("heading", { name: /Confirma tu seguro con Andina/ })).toBeVisible();
  await page.getByLabel("Nombres").fill("Ana");
  await page.getByLabel("Apellidos").fill("Gómez");
  await page.getByLabel("Número de documento").fill("1020304050");
  await page.getByLabel("Celular").fill("3001234567");
  await page.getByLabel("Dirección").fill("Calle 10 # 43-21");
  const kyc = page.getByRole("region", { name: "Conocimiento del cliente" });
  for (const select of await kyc.locator("select").all()) await select.selectOption({ index: 1 });
  for (const no of await kyc.getByText("No", { exact: true }).all()) await no.click();
  await page.getByText(/Pagar mi parte por nómina/).click();
  await page.getByText("Leí y acepto").click();
  await page.getByText("Autorizo el tratamiento").click();
  await page.getByRole("button", { name: "Confirmar" }).filter({ visible: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Confirma tu compra" });
  await dialog.getByLabel("Código de aceptación").fill(await dialog.locator("strong.tracking-widest").innerText());
  await dialog.getByRole("button", { name: "Aceptar" }).click();

  await expect(page.getByRole("heading", { name: "¡Listo, ya estás asegurado!" })).toBeVisible();
  await expect(page.getByText(/se descontará de tu nómina en 12 cuotas/)).toBeVisible();
  await page.goto("/empresas/andina-logistica");
  await expect(page.getByText("Tu póliza está emitida.")).toBeVisible();

  // La parte de la empresa aparece en su cobro.
  const cobro = await admin.request.get("/api/empresas/andina-logistica/cobro");
  expect(await cobro.text()).toContain("Descuento por nómina");
});
