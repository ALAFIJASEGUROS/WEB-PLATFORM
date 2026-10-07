import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import type { CheckoutInput } from "@/domain/schemas";
import { claimGuestPurchases, db, getOrCreateUser } from "./db";
import { applyPaymentUpdate, buildInstallments, canRetract, createOrder, CheckoutError, issuanceBackoffMs, ISSUANCE_MAX_ATTEMPTS, PriceChangedError, processIssuanceQueue, retractPolicy, startInstallmentPayment } from "./orders";
import { canTransition } from "./order-state";
import { configuredProviders, parseWompiEvent, paymentProvider, providerById, wompiIntegritySignature } from "./payments";
import { dispatchDueReminders, withinContactHours } from "./reminders";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

const input: CheckoutInput = {
  quote: {
    vehicle: { type: "moto", plate: "XYZ12A", brand: "Yamaha", model: "NMAX 155", year: 2023, commercialValue: 13_000_000 },
    driver: { birthdate: "1995-03-03", city: "Bogotá" },
    answers: { priority: "precio", use: "domicilios", parking: "calle", mileage: "alto", drivers: "solo", financed: false, deductibleTolerance: "alto", services: [], claimsLast3Years: 0 },
  },
  offerId: "bolivar:moto-plus",
  paymentPlan: "anual",
  policyholder: { firstName: "Ana", lastName: "Gómez", documentType: "CC", documentNumber: "1020304050", email: "Ana@Example.com", phone: "3001234567", address: "Calle 1 # 2-3" },
  consents: { terms: true, dataProcessing: true, marketing: true },
  kyc: { ocupacion: "independiente", ingresos: "2-5smmlv", pep: false },
};

beforeEach(() => {
  (globalThis as { __safDb?: unknown }).__safDb = undefined;
});

describe("Wompi", () => {
  it("firma de integridad = sha256(referencia+monto+moneda+secreto)", () => {
    expect(wompiIntegritySignature("REF1", 150000, "COP", "s3cr3t")).toBe(sha("REF1150000COPs3cr3t"));
  });

  it("valida la firma de eventos y rechaza alteraciones", () => {
    const transaction = { id: "tx-1", status: "APPROVED", amount_in_cents: 5000000, reference: "SAF-1" };
    const timestamp = 1_700_000_000;
    const checksum = sha(`tx-1APPROVED5000000${timestamp}events_secret`);
    const event = {
      event: "transaction.updated",
      data: { transaction },
      signature: { properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"], checksum },
      timestamp,
    };
    expect(parseWompiEvent(event, "events_secret")).toMatchObject({ reference: "SAF-1", status: "APPROVED", amountInCents: 5000000 });
    const tampered = { ...event, data: { transaction: { ...transaction, amount_in_cents: 100 } } };
    expect(parseWompiEvent(tampered, "events_secret")).toBeNull();
  });
});

describe("registro de pasarelas", () => {
  const env = { WOMPI_PUBLIC_KEY: "pub_test_x", WOMPI_INTEGRITY_SECRET: "i", WOMPI_EVENTS_SECRET: "e" };

  it("usa la simulada solo si no hay pasarelas reales", () => {
    expect(configuredProviders().map((p) => p.id)).toEqual(["simulado"]);
    Object.assign(process.env, env);
    try {
      expect(configuredProviders().map((p) => p.id)).toEqual(["wompi"]);
      expect(paymentProvider().id).toBe("wompi");
      expect(providerById("simulado")).toBeUndefined();
      // El webhook genérico delega en el adaptador, que valida su propia firma.
      expect(providerById("wompi")?.parseWebhook?.({ event: "x" }, new Headers())).toBeNull();
    } finally {
      for (const k of Object.keys(env)) delete process.env[k];
    }
  });
});

describe("órdenes y emisión", () => {
  it("recotiza en el servidor y emite la póliza al aprobar el pago (idempotente)", async () => {
    const order = await createOrder(input);
    expect(order.amountInCents).toBe(order.offer.annualPremium * 100);
    expect(order.policyholder.email).toBe("ana@example.com");

    const update = { reference: order.reference, transactionId: "t1", status: "APPROVED" as const, amountInCents: order.amountInCents, eventId: "e1" };
    await applyPaymentUpdate(update);
    await applyPaymentUpdate(update);
    await applyPaymentUpdate({ ...update, eventId: "e2" });

    expect(order.status).toBe("emitida");
    expect(db().policies.size).toBe(1);
    expect(db().outbox.filter((m) => m.subject.includes("está activa"))).toHaveLength(1);
  });

  it("marca error si el monto pagado no coincide", async () => {
    const order = await createOrder(input);
    await applyPaymentUpdate({ reference: order.reference, transactionId: "t", status: "APPROVED", amountInCents: 1, eventId: "x" });
    expect(order.status).toBe("error");
    expect(db().policies.size).toBe(0);
  });

  it("exige las preguntas SARLAFT de la aseguradora", async () => {
    await expect(createOrder({ ...input, kyc: {} })).rejects.toBeInstanceOf(CheckoutError);
    await expect(createOrder({ ...input, kyc: { ...input.kyc, ingresos: "inventado" } })).rejects.toBeInstanceOf(CheckoutError);
    const order = await createOrder(input);
    expect(order.kyc).toEqual({ ocupacion: "independiente", ingresos: "2-5smmlv", pep: false });
  });

  it("rechaza ofertas inexistentes", async () => {
    await expect(createOrder({ ...input, offerId: "bolivar:no-existe" })).rejects.toBeInstanceOf(CheckoutError);
  });

  it("al crear cuenta con el mismo correo reclama la póliza y crea recordatorio de renovación", async () => {
    const order = await createOrder(input);
    await applyPaymentUpdate({ reference: order.reference, transactionId: "t", status: "APPROVED", amountInCents: order.amountInCents, eventId: "y" });
    const user = getOrCreateUser("ana@example.com");
    claimGuestPurchases(user);
    const policy = [...db().policies.values()][0];
    expect(policy.userId).toBe(user.id);
    expect(user.marketingConsent).toBe(true);
    expect(user.name).toBe("Ana Gómez");
    expect([...db().vehicles.values()][0].plate).toBe("XYZ12A");
    expect([...db().reminders.values()].some((r) => r.kind === "poliza" && r.dueDate === policy.endDate)).toBe(true);
  });
});

describe("pago mensual", () => {
  it("genera 12 cuotas mensuales respetando fin de mes", () => {
    const list = buildInstallments("2026-01-31", 100);
    expect(list).toHaveLength(12);
    expect(list[0].status).toBe("pagada");
    expect(list.slice(0, 3).map((i) => i.dueDate)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });

  it("crea el recordatorio de la próxima cuota y lo mueve al pagar", async () => {
    const user = getOrCreateUser("ana@example.com");
    const order = await createOrder({ ...input, paymentPlan: "mensual" }, user.id);
    await applyPaymentUpdate({ reference: order.reference, transactionId: "t", status: "APPROVED", amountInCents: order.amountInCents, eventId: "m1" });
    const policy = [...db().policies.values()][0];
    expect(policy.installments?.filter((i) => i.status === "pagada")).toHaveLength(1);
    const reminder = () => [...db().reminders.values()].find((r) => r.kind === "cuota")!;
    expect(reminder().dueDate).toBe(policy.installments![1].dueDate);

    const res = await startInstallmentPayment(policy.id, user.id, "http://x");
    expect(res.redirectUrl).toBe("/cuenta/seguros?cuota=2");
    expect(policy.installments![1].status).toBe("pagada");
    expect(reminder().dueDate).toBe(policy.installments![2].dueDate);
    await expect(startInstallmentPayment(policy.id, "otro", "http://x")).rejects.toBeInstanceOf(CheckoutError);
  });
});

describe("recordatorios", () => {
  it("respeta el horario de la Ley 2300", () => {
    expect(withinContactHours(new Date("2026-10-05T15:00:00Z"))).toBe(true); // lunes 10:00
    expect(withinContactHours(new Date("2026-10-06T01:00:00Z"))).toBe(false); // lunes 20:00
    expect(withinContactHours(new Date("2026-10-10T21:00:00Z"))).toBe(false); // sábado 16:00
    expect(withinContactHours(new Date("2026-10-11T15:00:00Z"))).toBe(false); // domingo
  });

  it("envía una sola vez dentro de la ventana de aviso", async () => {
    const user = getOrCreateUser("b@example.com");
    db().reminders.set("r1", { id: "r1", userId: user.id, kind: "soat", title: "SOAT", dueDate: "2026-10-12", daysBefore: 15, auto: true });
    db().reminders.set("r2", { id: "r2", userId: user.id, kind: "soat", title: "Lejano", dueDate: "2027-03-01", daysBefore: 15, auto: true });
    const now = new Date("2026-10-05T15:00:00Z");
    expect((await dispatchDueReminders(now)).sent).toBe(1);
    expect((await dispatchDueReminders(now)).sent).toBe(0);
  });
});

describe("analítica", () => {
  it("cuenta sesiones únicas por paso del embudo", async () => {
    const { recordEvent, funnel } = await import("./analytics");
    (globalThis as { __safEvents?: unknown }).__safEvents = undefined;
    recordEvent("cotizacion_iniciada", "s1");
    recordEvent("cotizacion_iniciada", "s1");
    recordEvent("cotizacion_iniciada", "s2");
    recordEvent("vehiculo_identificado", "s1");
    const [start, vehicle] = funnel();
    expect(start.sessions).toBe(2);
    expect(vehicle.sessions).toBe(1);
    expect(vehicle.fromPrevious).toBe(0.5);
  });
});

describe("evidencia de consentimientos", () => {
  it("guarda versión, fecha e IP de cada autorización del checkout", async () => {
    const order = await createOrder(input, undefined, { ip: "1.2.3.4", userAgent: "test" });
    expect(order.consentEvidence.map((c) => [c.purpose, c.granted])).toEqual([
      ["terms", true],
      ["dataProcessing", true],
      ["marketing", true],
    ]);
    expect(order.consentEvidence[0]).toMatchObject({ ip: "1.2.3.4", source: "checkout", version: "terminos-2026-10" });
  });
});

describe("retracto", () => {
  async function issued() {
    const user = getOrCreateUser("ana@example.com");
    const order = await createOrder({ ...input, paymentPlan: "mensual" }, user.id);
    await applyPaymentUpdate({ reference: order.reference, transactionId: "t", status: "APPROVED", amountInCents: order.amountInCents, eventId: `r-${order.reference}` });
    return { user, order, policy: [...db().policies.values()].find((p) => p.orderId === order.id)! };
  }

  it("anula la póliza dentro del plazo, quita recordatorios y bloquea cuotas", async () => {
    const { user, order, policy } = await issued();
    expect(canRetract(policy)).toBe(true);
    const { refund } = retractPolicy(policy.id, { userId: user.id });
    expect(refund).toBe(order.amountInCents / 100);
    expect(policy.status).toBe("retractada");
    expect(order.status).toBe("retractada");
    expect([...db().reminders.values()].some((r) => r.policyId === policy.id)).toBe(false);
    await expect(startInstallmentPayment(policy.id, user.id, "http://x")).rejects.toBeInstanceOf(CheckoutError);
  });

  it("no permite retracto fuera del plazo ni a terceros", async () => {
    const { user, policy } = await issued();
    expect(canRetract(policy, "2099-01-01")).toBe(false);
    expect(() => retractPolicy(policy.id, { userId: "otro" })).toThrow(CheckoutError);
    expect(() => retractPolicy(policy.id, { userId: user.id })).not.toThrow();
  });
});

describe("cuotas con Wompi", () => {
  it("reutiliza el intento activo en lugar de crear otro cobro", async () => {
    const user = getOrCreateUser("ana@example.com");
    const order = await createOrder({ ...input, paymentPlan: "mensual" }, user.id);
    await applyPaymentUpdate({ reference: order.reference, transactionId: "t", status: "APPROVED", amountInCents: order.amountInCents, eventId: "w1" });
    const policy = [...db().policies.values()][0];
    Object.assign(process.env, { WOMPI_PUBLIC_KEY: "pub_test_x", WOMPI_INTEGRITY_SECRET: "i", WOMPI_EVENTS_SECRET: "e" });
    try {
      const a = await startInstallmentPayment(policy.id, user.id, "http://x");
      const b = await startInstallmentPayment(policy.id, user.id, "http://x");
      expect(a.redirectUrl).toBe(b.redirectUrl);
      expect(db().installmentPayments.size).toBe(1);
      const [attempt] = db().installmentPayments.values();
      await applyPaymentUpdate({ reference: attempt.reference, transactionId: "t2", status: "DECLINED", amountInCents: attempt.amountInCents, eventId: "w2" });
      const c = await startInstallmentPayment(policy.id, user.id, "http://x");
      expect(c.redirectUrl).not.toBe(a.redirectUrl);
    } finally {
      delete process.env.WOMPI_PUBLIC_KEY;
      delete process.env.WOMPI_INTEGRITY_SECRET;
      delete process.env.WOMPI_EVENTS_SECRET;
    }
  });
});

describe("recordatorios: festivos y un contacto al día", () => {
  it("no contacta en festivos y agrupa varios avisos en un solo mensaje", async () => {
    (globalThis as { __safLastContact?: unknown }).__safLastContact = undefined;
    expect(withinContactHours(new Date("2026-10-12T15:00:00Z"))).toBe(false); // lunes festivo
    const user = getOrCreateUser("c@example.com");
    for (const id of ["a", "b"]) {
      db().reminders.set(id, { id, userId: user.id, kind: "soat", title: `Aviso ${id}`, dueDate: "2026-10-14", daysBefore: 15, auto: true });
    }
    const before = db().outbox.length;
    expect((await dispatchDueReminders(new Date("2026-10-06T15:00:00Z"))).sent).toBe(1);
    expect(db().outbox.length - before).toBe(1);
    expect(db().outbox[0].body).toMatch(/Aviso a[\s\S]*Aviso b/);
  });
});

describe("re-cotización al renovar", () => {
  it("sugiere una opción con la misma cobertura y al menos 5% de ahorro", async () => {
    const { renewalSuggestions } = await import("./renewals");
    (globalThis as { __safQuoteCache?: unknown }).__safQuoteCache = undefined;
    const user = getOrCreateUser("r@example.com");
    const particular = { ...input.quote, answers: { ...input.quote.answers, use: "particular" as const } };
    const order = await createOrder({ ...input, quote: particular, offerId: "bolivar:moto-basico" }, user.id);
    await applyPaymentUpdate({ reference: order.reference, transactionId: "t", status: "APPROVED", amountInCents: order.amountInCents, eventId: "ren1" });
    const policy = [...db().policies.values()].find((p) => p.orderId === order.id)!;
    const now = new Date();
    const end = new Date(now.getTime() + 20 * 86_400_000).toISOString().slice(0, 10);

    policy.endDate = end;
    expect(await renewalSuggestions(user.id, now)).toHaveLength(0); // ya es lo más barato con esa cobertura

    policy.annualPremium = order.offer.annualPremium * 3;
    const [s] = await renewalSuggestions(user.id, now);
    expect(s.offer.coverages.rc && s.offer.coverages.perdidaTotalHurto).toBe(true);
    expect(s.savings).toBeGreaterThan(0);

    policy.endDate = new Date(now.getTime() + 90 * 86_400_000).toISOString().slice(0, 10);
    expect(await renewalSuggestions(user.id, now)).toHaveLength(0); // fuera de la ventana
  });
});

describe("roles de administración", () => {
  it("interpreta ADMIN_EMAILS e ignora roles desconocidos", async () => {
    const { adminRoles } = await import("./admin");
    const roles = adminRoles(" Ana@X.co:admin, luis@x.co:analista, eve@x.co:root ,");
    expect(roles.get("ana@x.co")).toBe("admin");
    expect(roles.get("luis@x.co")).toBe("analista");
    expect(roles.has("eve@x.co")).toBe(false);
  });
});

describe("PQR", () => {
  it("radica con plazo de 15 días hábiles y notifica la respuesta", async () => {
    const { createPqr, updatePqr } = await import("./pqr");
    const { addBusinessDays, todayInColombia } = await import("@/domain/holidays");
    const pqr = createPqr({ type: "reclamo", name: "Ana Gómez", email: "Ana@Example.com", message: "No me llegó la póliza al correo." });
    expect(pqr.radicado).toMatch(/^PQR-\d{4}-000001$/);
    expect(pqr.dueDate).toBe(addBusinessDays(todayInColombia(), 15));
    expect(db().outbox[0].subject).toContain(pqr.radicado);
    updatePqr(pqr.id, "respondida", "Te reenviamos la póliza.");
    expect(pqr.status).toBe("respondida");
    expect(db().outbox[0]).toMatchObject({ to: "ana@example.com", body: "Te reenviamos la póliza." });
  });
});

describe("aceptación con código", () => {
  it("exige el código correcto, limita intentos y deja evidencia", async () => {
    const { startAcceptance, confirmAcceptance, isAccepted } = await import("./orders");
    const order = await createOrder(input);
    const { demoCode } = startAcceptance(order, true);
    expect(demoCode).toMatch(/^\d{6}$/);
    expect(db().outbox[0].subject).toMatch(/aceptar tu compra/);
    const wrong = demoCode === "000000" ? "111111" : "000000";
    expect(() => confirmAcceptance(order.reference, order.accessToken, wrong)).toThrow(CheckoutError);
    expect(() => confirmAcceptance(order.reference, "otro-token", demoCode!)).toThrow(CheckoutError);
    expect(isAccepted(order)).toBe(false);
    confirmAcceptance(order.reference, order.accessToken, demoCode!, { ip: "9.9.9.9" });
    expect(isAccepted(order)).toBe(true);
    expect(order.consentEvidence.at(-1)).toMatchObject({ purpose: "terms", source: "aceptacion-otp", ip: "9.9.9.9" });
  });

  it("bloquea tras 5 intentos fallidos", async () => {
    const { startAcceptance, confirmAcceptance } = await import("./orders");
    const order = await createOrder(input);
    const { demoCode } = startAcceptance(order, true);
    const wrong = demoCode === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) expect(() => confirmAcceptance(order.reference, order.accessToken, wrong)).toThrow();
    expect(() => confirmAcceptance(order.reference, order.accessToken, demoCode!)).toThrow(/Demasiados intentos/);
  });
});

describe("conciliación", () => {
  it("reporta pagos atascados, órdenes sin aceptar y errores de emisión", async () => {
    const { reconcilePayments } = await import("./reconciliation");
    const { startAcceptance, confirmAcceptance } = await import("./orders");
    const stuck = await createOrder(input);
    const { demoCode } = startAcceptance(stuck, true);
    confirmAcceptance(stuck.reference, stuck.accessToken, demoCode!);
    const abandoned = await createOrder(input);
    const broken = await createOrder(input);
    await applyPaymentUpdate({ reference: broken.reference, transactionId: "t", status: "APPROVED", amountInCents: 1, eventId: "bad" });
    const ok = await createOrder(input);
    await applyPaymentUpdate({ reference: ok.reference, transactionId: "t2", status: "APPROVED", amountInCents: ok.amountInCents, eventId: "good" });

    const report = await reconcilePayments(Date.now() + 31 * 60_000);
    const kinds = Object.fromEntries(report.issues.map((i) => [i.reference, i.kind]));
    expect(kinds[stuck.reference]).toBe("pago_pendiente");
    expect(kinds[abandoned.reference]).toBe("sin_aceptacion");
    expect(kinds[broken.reference]).toBe("error_emision");
    expect(kinds[ok.reference]).toBeUndefined();
    expect(report.checked).toBe(4);
  }, 20_000);
});

describe("estados de la orden", () => {
  it("solo permite transiciones monótonas y guarda el historial", async () => {
    expect(canTransition("emitida", "pendiente")).toBe(false);
    expect(canTransition("aprobada", "rechazada")).toBe(false);
    expect(canTransition("rechazada", "aprobada")).toBe(true);
    const order = await createOrder(input);
    await applyPaymentUpdate({ reference: order.reference, transactionId: "t1", status: "DECLINED", amountInCents: order.amountInCents, eventId: "s1" });
    await applyPaymentUpdate({ reference: order.reference, transactionId: "t2", status: "APPROVED", amountInCents: order.amountInCents, eventId: "s2" });
    // Un evento tardío de rechazo no deshace la emisión.
    await applyPaymentUpdate({ reference: order.reference, transactionId: "t1", status: "DECLINED", amountInCents: order.amountInCents, eventId: "s3" });
    expect(order.status).toBe("emitida");
    expect(order.history?.map((h) => h.status)).toEqual(["pendiente", "rechazada", "aprobada", "emitida"]);
  });
});

describe("emisión asíncrona", () => {
  const emi = { ...input, quote: { ...input.quote, vehicle: { ...input.quote.vehicle, plate: "EMI12A" } } };

  it("si la aseguradora falla, reintenta sin volver a cobrar y emite una sola póliza", async () => {
    const order = await createOrder(emi);
    const t0 = Date.now();
    await applyPaymentUpdate({ reference: order.reference, transactionId: "t", status: "APPROVED", amountInCents: order.amountInCents, eventId: "e1" });
    expect(order.status).toBe("aprobada");
    const job = db().issuanceJobs.get(order.id)!;
    expect(job).toMatchObject({ attempts: 1, status: "pendiente" });
    expect(job.lastError).toMatch(/no pudo emitir/);

    expect((await processIssuanceQueue(t0)).processed).toBe(0); // aún no le toca
    await processIssuanceQueue(t0 + issuanceBackoffMs(1) + 1000);
    await processIssuanceQueue(t0 + issuanceBackoffMs(2) * 10);
    expect(order.status).toBe("emitida");
    expect(job).toMatchObject({ attempts: 2, status: "completada" });
    expect([...db().policies.values()].filter((p) => p.orderId === order.id)).toHaveLength(1);
  });

  it("tras el máximo de intentos marca error y avisa al cliente y a los administradores", async () => {
    process.env.ADMIN_EMAILS = "ops@e2e.test:admin";
    const order = await createOrder(input);
    order.offer = { ...order.offer, insurerId: "inexistente" };
    await applyPaymentUpdate({ reference: order.reference, transactionId: "t", status: "APPROVED", amountInCents: order.amountInCents, eventId: "e2" });
    let now = Date.now();
    for (let i = 1; i < ISSUANCE_MAX_ATTEMPTS; i++) {
      now += issuanceBackoffMs(i) + 1000;
      await processIssuanceQueue(now);
    }
    expect(db().issuanceJobs.get(order.id)?.status).toBe("fallida");
    expect(order.status).toBe("error");
    expect(db().outbox.some((m) => m.to === "ops@e2e.test" && /Emisión fallida/.test(m.subject))).toBe(true);
    expect(db().outbox.some((m) => m.to === "ana@example.com" && /devolveremos/.test(m.body))).toBe(true);
    delete process.env.ADMIN_EMAILS;
  });
});

describe("revalidación del checkout", () => {
  it("pide confirmar si el precio cambió desde que se cotizó", async () => {
    const probe = await createOrder(input);
    const real = probe.amountInCents / 100;
    await expect(createOrder({ ...input, expectedAmount: real - 5000 })).rejects.toBeInstanceOf(PriceChangedError);
    await expect(createOrder({ ...input, expectedAmount: real })).resolves.toMatchObject({ amountInCents: real * 100 });
  });

  it("rechaza planes que no aplican para el uso declarado", async () => {
    await expect(createOrder({ ...input, offerId: "bolivar:moto-basico" })).rejects.toThrow(/domicilios/);
  });
});

describe("avisos de mora", () => {
  it("avisa una sola vez por cuota vencida, explicando la terminación por mora", async () => {
    const user = getOrCreateUser("mora@example.com");
    const order = await createOrder({ ...input, paymentPlan: "mensual", policyholder: { ...input.policyholder, email: "mora@example.com" } }, user.id);
    await applyPaymentUpdate({ reference: order.reference, transactionId: "t", status: "APPROVED", amountInCents: order.amountInCents, eventId: "m1" });
    const policy = [...db().policies.values()].find((p) => p.orderId === order.id)!;
    const now = new Date("2026-10-06T15:00:00Z"); // martes, 10:00 en Colombia
    policy.installments![1].dueDate = "2026-10-01";
    const { overdueInstallment } = await import("./queries");
    expect(overdueInstallment(policy, now)?.n).toBe(2);

    expect((await dispatchDueReminders(now)).sent).toBe(1);
    expect(db().outbox[0].subject).toMatch(/cuota vencida/);
    expect(db().outbox[0].body).toMatch(/art\. 1068/);
    (globalThis as { __safLastContact?: unknown }).__safLastContact = undefined;
    expect((await dispatchDueReminders(new Date("2026-10-07T15:00:00Z"))).sent).toBe(0);
  });
});

describe("centro de preferencias", () => {
  it("respeta los tipos apagados pero siempre avisa la mora", async () => {
    const { normalizePreferences, channelFor, DEFAULT_PREFERENCES } = await import("@/domain/messaging");
    const off = normalizePreferences({ ...DEFAULT_PREFERENCES, transaccional: { email: false, whatsapp: true }, vencimientos: { email: false, whatsapp: false } }, false);
    expect(off.transaccional).toEqual({ email: true, whatsapp: false }); // obligatorio y sin celular
    expect(channelFor(off, "vencimientos", false)).toBeNull();
    expect(channelFor({ ...off, renovacion: { email: true, whatsapp: true } }, "renovacion", true)).toBe("whatsapp");

    const user = getOrCreateUser("pref@example.com");
    user.preferences = off;
    const order = await createOrder({ ...input, paymentPlan: "mensual", policyholder: { ...input.policyholder, email: "pref@example.com" } }, user.id);
    await applyPaymentUpdate({ reference: order.reference, transactionId: "t", status: "APPROVED", amountInCents: order.amountInCents, eventId: "p1" });
    const policy = [...db().policies.values()].find((p) => p.orderId === order.id)!;
    const now = new Date("2026-10-06T15:00:00Z");
    // Cuota por vencer en 2 días: es un vencimiento y está apagado.
    policy.installments![1].dueDate = "2026-10-08";
    const { syncInstallmentReminder } = await import("./db");
    syncInstallmentReminder(policy);
    expect((await dispatchDueReminders(now)).sent).toBe(0);

    // Vencida: es transaccional y se envía por correo aunque los vencimientos estén apagados.
    policy.installments![1].dueDate = "2026-10-01";
    expect((await dispatchDueReminders(now)).sent).toBe(1);
    expect(db().outbox[0]).toMatchObject({ channel: "email", kind: "transaccional" });
  });
});

describe("descuentos en la compra", () => {
  it("cobra el precio con descuento y pide confirmar si la regla se apaga antes de pagar", async () => {
    const { discountConfig } = await import("./discounts");
    (globalThis as { __safDiscounts?: unknown }).__safDiscounts = undefined;
    const cfg = discountConfig();
    // Bolívar motos: 8% con tope de $60.000 (regla inicial).
    const order = await createOrder(input);
    expect(order.offer.discounts?.[0]).toMatchObject({ ruleId: "bolivar-motos", source: "aseguradora" });
    const paid = order.amountInCents / 100;
    expect(order.offer.listPremium! - paid).toBe(order.offer.discounts![0].amount);

    cfg.rules.find((r) => r.id === "bolivar-motos")!.enabled = false;
    await expect(createOrder({ ...input, expectedAmount: paid })).rejects.toBeInstanceOf(PriceChangedError);
    cfg.settings.enabled = false;
    const full = await createOrder(input);
    expect(full.offer.discounts).toBeUndefined();
    expect(full.amountInCents / 100).toBe(order.offer.listPremium);
    (globalThis as { __safDiscounts?: unknown }).__safDiscounts = undefined;
  });
});

describe("reportes de experimentos y descuentos", () => {
  it("cruza la exposición con el embudo por sesión y calcula el valor p", async () => {
    const { recordEvent, experimentResults, twoProportionPValue } = await import("./analytics");
    const { WEIGHT_EXPERIMENTS } = await import("@/recommendation/experiments");
    (globalThis as { __safEvents?: unknown }).__safEvents = undefined;
    const exp = WEIGHT_EXPERIMENTS[0];
    recordEvent("resultados_vistos", "s1", { variante: `${exp.id}:control` });
    recordEvent("resultados_vistos", "s2", { variante: `${exp.id}:mas-precio` });
    recordEvent("resultados_vistos", "s3", { variante: `${exp.id}:mas-precio` });
    recordEvent("oferta_elegida", "s2", { recomendado: true });
    recordEvent("checkout_enviado", "s2");
    recordEvent("pago_aprobado", "s2");
    recordEvent("pago_aprobado", "s9"); // sin exposición: no cuenta
    const [control, b] = experimentResults(exp);
    expect(control).toMatchObject({ exposed: 1, paid: 0, conversion: 0 });
    expect(b).toMatchObject({ exposed: 2, choseRecommended: 1, checkout: 1, paid: 1, conversion: 0.5 });
    expect(twoProportionPValue(50, 1000, 50, 1000)).toBeCloseTo(1, 5);
    expect(twoProportionPValue(80, 1000, 50, 1000)!).toBeLessThan(0.01);
  });

  it("mide elección, compra y costo por regla de descuento", async () => {
    const { recordEvent, discountImpact, NO_DISCOUNT } = await import("./analytics");
    (globalThis as { __safEvents?: unknown }).__safEvents = undefined;
    (globalThis as { __safDiscounts?: unknown }).__safDiscounts = undefined;
    const order = await createOrder(input); // Bolívar motos con descuento
    await applyPaymentUpdate({ reference: order.reference, transactionId: "t", status: "APPROVED", amountInCents: order.amountInCents, eventId: "di1" });
    recordEvent("oferta_elegida", "a", { descuentos: "bolivar-motos" });
    recordEvent("oferta_elegida", "b", { descuentos: "bolivar-motos" });
    recordEvent("oferta_elegida", "c", {});
    const rows = discountImpact([...db().orders.values()]);
    const rule = rows.find((r) => r.key === "bolivar-motos")!;
    expect(rule).toMatchObject({ chosen: 2, orders: 1, paid: 1, conversion: 0.5, source: "aseguradora" });
    expect(rule.granted).toBe(order.offer.discounts![0].amount);
    expect(rule.premium).toBe(order.offer.annualPremium);
    expect(rows.find((r) => r.key === NO_DISCOUNT)).toMatchObject({ chosen: 1, paid: 0 });
  });
});
