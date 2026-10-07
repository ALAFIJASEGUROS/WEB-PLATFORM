import { extractText, getDocumentProxy } from "unpdf";
import { parsePolicyText } from "@/domain/policy-pdf";
import { getCurrentUser } from "@/server/auth";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PAGES = 20;

// Lee una póliza en PDF y devuelve los datos encontrados para que el usuario
// los confirme. El archivo se procesa en memoria y no se guarda.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Inicia sesión para cargar pólizas." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("archivo");
  if (!(file instanceof File)) return Response.json({ error: "Adjunta el PDF de tu póliza." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "El archivo pesa más de 5 MB." }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Firma "%PDF-": no se confía en la extensión ni en el tipo declarado.
  if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") {
    return Response.json({ error: "El archivo no es un PDF." }, { status: 415 });
  }

  let text = "";
  try {
    const pdf = await getDocumentProxy(bytes);
    if (pdf.numPages > MAX_PAGES) return Response.json({ error: `La póliza tiene más de ${MAX_PAGES} páginas.` }, { status: 413 });
    text = (await extractText(pdf, { mergePages: true })).text;
  } catch {
    return Response.json({ error: "No pudimos leer el PDF. Puede estar dañado o protegido con contraseña." }, { status: 422 });
  }
  if (text.trim().length < 20) {
    return Response.json(
      { error: "El PDF no tiene texto (parece escaneado). Completa los datos a mano." },
      { status: 422 },
    );
  }
  return Response.json({ fields: parsePolicyText(text) });
}
