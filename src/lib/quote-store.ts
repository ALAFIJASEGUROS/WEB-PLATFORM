"use client";

import { useSyncExternalStore } from "react";
import type { QuoteRequest, QuoteResponse } from "@/domain/types";

// Estado del flujo de cotización en sessionStorage: permite comprar sin cuenta
// y sobrevive recargas dentro de la misma pestaña.

const KEYS = {
  request: "saf:quote-request",
  response: "saf:quote-response:v3",
  compare: "saf:compare",
} as const;
type Key = (typeof KEYS)[keyof typeof KEYS];

const listeners = new Set<() => void>();
const cache = new Map<Key, { raw: string | null; value: unknown }>();

function read<T>(key: Key): T | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(key);
  } catch {
    /* almacenamiento no disponible */
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value: T | null = null;
  try {
    value = raw ? (JSON.parse(raw) as T) : null;
  } catch {
    value = null;
  }
  cache.set(key, { raw, value });
  return value;
}

function write(key: Key, value: unknown) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const quoteStore = {
  getRequest: () => read<QuoteRequest>(KEYS.request),
  setRequest: (r: QuoteRequest) => {
    write(KEYS.response, null);
    write(KEYS.compare, null);
    write(KEYS.request, r);
  },
  getResponse: () => read<QuoteResponse>(KEYS.response),
  setResponse: (r: QuoteResponse) => write(KEYS.response, r),
  getCompare: () => read<string[]>(KEYS.compare) ?? EMPTY,
  setCompare: (ids: string[]) => write(KEYS.compare, ids),
  clear: () => Object.values(KEYS).forEach((k) => write(k, null)),
};

const EMPTY: string[] = [];

function useStored<T>(get: () => T, server: T): T {
  return useSyncExternalStore(subscribe, get, () => server);
}

export const useQuoteRequest = () => useStored(quoteStore.getRequest, null);
export const useQuoteResponse = () => useStored(quoteStore.getResponse, null);
export const useCompare = () => useStored(quoteStore.getCompare, EMPTY);

const noop = () => () => {};
/** true solo en el cliente después de hidratar. */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}
