import "server-only";
import { FUNNEL_EVENTS, type AnalyticsEvent } from "@/domain/events";

export interface StoredEvent {
  event: AnalyticsEvent;
  sid: string;
  props: Record<string, string | number | boolean>;
  at: string;
}

const MAX_EVENTS = 20_000;
const g = globalThis as unknown as { __safEvents?: StoredEvent[] };
const events = () => (g.__safEvents ??= []);

export function recordEvent(event: AnalyticsEvent, sid: string, props: StoredEvent["props"] = {}) {
  const list = events();
  list.push({ event, sid, props, at: new Date().toISOString() });
  if (list.length > MAX_EVENTS) list.splice(0, list.length - MAX_EVENTS);
}

/** Sesiones únicas que llegaron a cada paso del embudo. */
export function funnel() {
  const bySid = new Map<string, Set<AnalyticsEvent>>();
  for (const e of events()) {
    if (!bySid.has(e.sid)) bySid.set(e.sid, new Set());
    bySid.get(e.sid)!.add(e.event);
  }
  const counts = FUNNEL_EVENTS.map((step) => ({
    step,
    sessions: [...bySid.values()].filter((s) => s.has(step)).length,
  }));
  return counts.map((c, i) => ({
    ...c,
    fromPrevious: i === 0 || counts[i - 1].sessions === 0 ? null : c.sessions / counts[i - 1].sessions,
  }));
}

/** Conteo de un evento agrupado por una propiedad (p. ej. aseguradora elegida). */
export function breakdown(event: AnalyticsEvent, prop: string) {
  const acc: Record<string, number> = {};
  for (const e of events()) {
    if (e.event !== event) continue;
    const k = String(e.props[prop] ?? "—");
    acc[k] = (acc[k] ?? 0) + 1;
  }
  return Object.entries(acc).sort((a, b) => b[1] - a[1]);
}
