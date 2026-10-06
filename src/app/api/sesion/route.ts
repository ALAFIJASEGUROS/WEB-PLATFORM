import { getCurrentUser } from "@/server/auth";

export async function GET() {
  const user = await getCurrentUser();
  return Response.json(
    user ? { name: user.name ?? null, email: user.email } : null,
    { headers: { "cache-control": "no-store" } },
  );
}
