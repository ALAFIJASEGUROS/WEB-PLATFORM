import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import type { CheckoutInput } from "@/domain/schemas";
import { claimGuestPurchases, db, getOrCreateUser } from "./db";
import { applyPaymentUpdate, createOrder, CheckoutError } from "./orders";
import { parseWompiEvent, wompiIntegritySignature } from "./payments";
import { dispatchDueReminders, withinContactHours } from "./reminders";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

const input: CheckoutInput = {
  quote: {
    vehicle: { type: "moto", plate: "XYZ12A", brand: "Yamaha", model: "NMAX 155", year: 2023, commercialValue: 13_000_000 },
    driver: { birthdate: "1995-03-03", city: "Bogotá" },
    answers: { priority: "precio", use: "domicilios", parking: "calle", financed: false, deductibleTolerance: "alto", services: [], claimsLast3Years: 0 },
  },
  offerId: "bolivar:moto-plus",
  paymentPlan: "anual",
  policyholder: { firstName: "Ana", lastName: "Gómez", documentType: "CC", documentNumber: "1020304050", email: "Ana@Example.com", phone: "3001234567", address: "Calle 1 # 2-3" },
  consents: { terms: true, dataProcessing: true, marketing: true },
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

describe("recordatorios", () => {
  it("respeta el horario de la Ley 2300", () => {
    expect(withinContactHours(new Date("2026-10-05T15:00:00Z"))).toBe(true); // lunes 10:00
    expect(withinContactHours(new Date("2026-10-06T01:00:00Z"))).toBe(false); // lunes 20:00
    expect(withinContactHours(new Date("2026-10-10T21:00:00Z"))).toBe(false); // sábado 16:00
    expect(withinContactHours(new Date("2026-10-11T15:00:00Z"))).toBe(false); // domingo
  });

  it("envía una sola vez dentro de la ventana de aviso", () => {
    const user = getOrCreateUser("b@example.com");
    db().reminders.set("r1", { id: "r1", userId: user.id, kind: "soat", title: "SOAT", dueDate: "2026-10-12", daysBefore: 15, auto: true });
    db().reminders.set("r2", { id: "r2", userId: user.id, kind: "soat", title: "Lejano", dueDate: "2027-03-01", daysBefore: 15, auto: true });
    const now = new Date("2026-10-05T15:00:00Z");
    expect(dispatchDueReminders(now).sent).toBe(1);
    expect(dispatchDueReminders(now).sent).toBe(0);
  });
});
