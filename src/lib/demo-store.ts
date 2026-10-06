"use client";

import type { CheckoutInput } from "@/domain/schemas";
import type { Offer } from "@/domain/types";
import { quoteStore } from "./quote-store";

// Órdenes y pólizas de la demo estática, guardadas en localStorage.

export interface DemoOrder {
  reference: string;
  createdAt: string;
  status: "pendiente" | "emitida" | "rechazada";
  input: CheckoutInput;
  offer: Offer;
  amount: number;
  policy?: { id: string; number: string; startDate: string; endDate: string };
}

const KEY = "saf:demo-orders";

export function readDemoOrders(): DemoOrder[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(orders: DemoOrder[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(orders));
  } catch {
    /* sin almacenamiento */
  }
}

export function createDemoOrder(input: CheckoutInput): DemoOrder | null {
  const offer = quoteStore.getResponse()?.offers.find((o) => o.id === input.offerId);
  if (!offer) return null;
  const order: DemoOrder = {
    reference: `SAF-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    status: "pendiente",
    input,
    offer,
    amount: input.paymentPlan === "anual" ? offer.annualPremium : offer.monthlyPremium,
  };
  save([order, ...readDemoOrders()]);
  return order;
}

export function findDemoOrder(reference: string) {
  return readDemoOrders().find((o) => o.reference === reference) ?? null;
}

export function settleDemoOrder(reference: string, approved: boolean) {
  const orders = readDemoOrders();
  const o = orders.find((x) => x.reference === reference);
  if (!o || o.status !== "pendiente") return o ?? null;
  if (!approved) {
    o.status = "rechazada";
  } else {
    const start = new Date();
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    const line = o.offer.vehicleType === "auto" ? "AU" : "MO";
    o.status = "emitida";
    o.policy = {
      id: o.reference.toLowerCase(),
      number: `${o.offer.insurerId.toUpperCase().slice(0, 3)}-${line}-${Date.now().toString().slice(-8)}`,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }
  save(orders);
  return o;
}
