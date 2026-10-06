import { z } from "zod";
import { FUNNEL_EVENTS, OTHER_EVENTS } from "@/domain/events";
import { recordEvent } from "@/server/analytics";

const schema = z.object({
  event: z.enum([...FUNNEL_EVENTS, ...OTHER_EVENTS]),
  sid: z.string().min(8).max(64),
  props: z.record(z.string().max(40), z.union([z.string().max(80), z.number(), z.boolean()])).default({}),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  recordEvent(parsed.data.event, parsed.data.sid, parsed.data.props);
  return new Response(null, { status: 204 });
}
