import "server-only";
import {
  applyDiscountsToAll,
  DEFAULT_DISCOUNT_RULES,
  DEFAULT_DISCOUNT_SETTINGS,
  type DiscountRule,
  type DiscountSettings,
} from "@/domain/discounts";
import type { Offer } from "@/domain/types";
import { todayInColombia } from "@/domain/holidays";

// Configuración de descuentos editable desde /admin. En memoria por ahora,
// igual que el resto de datos (pasa a Supabase con HU-09.6).

const g = globalThis as unknown as { __safDiscounts?: { rules: DiscountRule[]; settings: DiscountSettings } };

export function discountConfig() {
  return (g.__safDiscounts ??= {
    rules: structuredClone(DEFAULT_DISCOUNT_RULES),
    settings: { ...DEFAULT_DISCOUNT_SETTINGS },
  });
}

/** Aplica las reglas vigentes. Se llama después de la caché, así un cambio en /admin rige de inmediato. */
export function withDiscounts(offers: Offer[]) {
  const { rules, settings } = discountConfig();
  return applyDiscountsToAll(offers, rules, settings, todayInColombia());
}

export function upsertDiscountRule(rule: DiscountRule) {
  const cfg = discountConfig();
  const i = cfg.rules.findIndex((r) => r.id === rule.id);
  if (i >= 0) cfg.rules[i] = rule;
  else cfg.rules.push(rule);
  return rule;
}

export function deleteDiscountRule(id: string) {
  const cfg = discountConfig();
  cfg.rules = cfg.rules.filter((r) => r.id !== id);
}

export function updateDiscountSettings(settings: DiscountSettings) {
  discountConfig().settings = settings;
}
