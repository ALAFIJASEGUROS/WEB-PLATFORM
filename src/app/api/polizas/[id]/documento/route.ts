import { getCurrentUser } from "@/server/auth";
import { policyDocumentFor } from "@/server/policy-document";

export async function GET(req: Request, ctx: RouteContext<"/api/polizas/[id]/documento">) {
  const { id } = await ctx.params;
  const token = new URL(req.url).searchParams.get("t") ?? undefined;
  const user = await getCurrentUser();
  const result = await policyDocumentFor(id, token, user?.id);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  const { document: doc, policyNumber } = result;
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
  // URL firmada de la aseguradora: se redirige sin guardar el archivo.
  if (doc.url) return Response.redirect(doc.url, 302);
  const ext = doc.contentType.includes("pdf") ? "pdf" : "txt";
  return new Response(doc.data as BodyInit, {
    headers: {
      ...headers,
      "Content-Type": doc.contentType,
      "Content-Disposition": `attachment; filename="poliza-${policyNumber.replace(/[^\w-]/g, "")}.${ext}"`,
    },
  });
}
