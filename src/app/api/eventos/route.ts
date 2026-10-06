import { z } from "zod";
import { FUNNEL_EVENTS, OTHER_EVENTS } from "@/domain/events";
import { recordEvent } from "@/server/analytics";

/** Eventos que solo registra el servidor (p. ej. tras verificar un pago). */
const SERVER_ONLY = new Set(["pago_aprobado"]);
const CLIENT_EVENTS = [...FUNNEL_EVENTS, ...OTHER_EVENTS].filter((e) => !SERVER_ONLY.has(e)) as [string, ...string[]];
const MAX_BODY_BYTES = 2048;
const MAX_PROPS = 8;

const schema = z.object({
  event: z.enum(CLIENT_EVENTS),
  sid: z.string().min(8).max(64),
  props: z
    .record(z.string().max(40), z.union([z.string().max(80), z.number(), z.boolean()]))
    .refine((p) => Object.keys(p).length <= MAX_PROPS)
    .default({}),
});

export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return new Response(null, { status: 413 });
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    /* cuerpo inválido */
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400 });
  recordEvent(parsed.data.event as Parameters<typeof recordEvent>[0], parsed.data.sid, parsed.data.props);
  return new Response(null, { status: 204 });
}
