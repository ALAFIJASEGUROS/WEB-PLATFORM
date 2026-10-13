import type { DailySales } from "./admin";
import { todayInColombia } from "./holidays";

/**
 * Ventas por día (hora Colombia) de los últimos `days` días, con ceros en los
 * días sin movimiento para que la serie sea continua.
 */
export function salesByDay(
  orders: { createdAt: string; amount: number; issued: boolean }[],
  days = 30,
  now = new Date(),
): DailySales[] {
  const out = new Map<string, DailySales>();
  for (let i = days - 1; i >= 0; i--) {
    const date = todayInColombia(new Date(now.getTime() - i * 86_400_000));
    out.set(date, { date, orders: 0, issued: 0, revenue: 0 });
  }
  for (const o of orders) {
    const day = out.get(todayInColombia(new Date(o.createdAt)));
    if (!day) continue;
    day.orders++;
    if (o.issued) {
      day.issued++;
      day.revenue += o.amount;
    }
  }
  return [...out.values()];
}
