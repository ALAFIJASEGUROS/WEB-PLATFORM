// Sandbox FALSO de Bolívar para probar el modo sandbox de punta a punta en local:
//   INSURER_BOLIVAR_MODE=sandbox
//   BOLIVAR_API_URL=http://localhost:3000/api/sandbox/bolivar
//   BOLIVAR_TOKEN_URL=http://localhost:3000/api/sandbox/bolivar/oauth/token
//   BOLIVAR_CLIENT_ID=sandbox-client  BOLIVAR_CLIENT_SECRET=sandbox-secret
//   BOLIVAR_INTERMEDIARY_CODE=INT-LOCAL
// Fuera de desarrollo responde 404, salvo que FAKE_BOLIVAR_SANDBOX=1.
import { createFakeBolivarSandbox } from "@/insurers/bolivar/fake-sandbox";

const g = globalThis as unknown as { __safFakeBolivar?: ReturnType<typeof createFakeBolivarSandbox> };
const sandbox = () => (g.__safFakeBolivar ??= createFakeBolivarSandbox());
const enabled = () => process.env.NODE_ENV !== "production" || process.env.FAKE_BOLIVAR_SANDBOX === "1";

async function handle(req: Request, ctx: RouteContext<"/api/sandbox/bolivar/[...ruta]">) {
  if (!enabled()) return new Response("Not found", { status: 404 });
  const { ruta } = await ctx.params;
  return sandbox().handle(req, `/${ruta.map(encodeURIComponent).join("/")}`);
}

export const GET = handle;
export const POST = handle;
