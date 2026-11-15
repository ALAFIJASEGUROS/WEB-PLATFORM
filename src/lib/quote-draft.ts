"use client";

import type { Answers, Vehicle, VehicleType } from "@/domain/types";

// Borrador del cuestionario en localStorage: si la persona cierra la pestaña a
// mitad del camino, al volver puede retomar donde iba. Vive solo en su
// navegador, vence a los 7 días y se borra al terminar la cotización.

export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const key = (type: VehicleType) => `saf:quote-draft:${type}:v1`;

export interface QuoteDraft {
  savedAt: number;
  step: number;
  vehicle: Vehicle;
  birthdate: string;
  city: string;
  answers: Answers;
}

/** Un borrador sirve si tiene vehículo del tipo pedido y no ha vencido. */
export function isUsableDraft(d: unknown, type: VehicleType, now = Date.now()): d is QuoteDraft {
  if (!d || typeof d !== "object") return false;
  const x = d as Partial<QuoteDraft>;
  return (
    typeof x.savedAt === "number" &&
    now - x.savedAt < DRAFT_TTL_MS &&
    typeof x.step === "number" &&
    x.step >= 0 &&
    !!x.vehicle &&
    x.vehicle.type === type &&
    !!x.answers
  );
}

export const quoteDraft = {
  load(type: VehicleType, now = Date.now()): QuoteDraft | null {
    try {
      const raw = localStorage.getItem(key(type));
      const d = raw ? JSON.parse(raw) : null;
      if (isUsableDraft(d, type, now)) return d;
      if (raw) localStorage.removeItem(key(type));
    } catch {
      /* almacenamiento no disponible */
    }
    return null;
  },
  save(type: VehicleType, d: Omit<QuoteDraft, "savedAt">) {
    try {
      localStorage.setItem(key(type), JSON.stringify({ ...d, savedAt: Date.now() }));
    } catch {
      /* almacenamiento no disponible o lleno */
    }
  },
  clear(type: VehicleType) {
    try {
      localStorage.removeItem(key(type));
    } catch {
      /* almacenamiento no disponible */
    }
  },
};
