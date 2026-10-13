import type { MetadataRoute } from "next";
import { modelPages, modelPath } from "@/vehicles/pages";

export const dynamic = "force-static";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://segualafija.co";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/cotizar", "/cotizar/auto", "/cotizar/moto", "/como-funciona", "/ayuda", "/siniestros", "/glosario", "/calculadoras", "/calculadoras/precio", "/calculadoras/deducible", "/calculadoras/todo-riesgo", "/aseguradoras", "/pqr", "/legal/terminos", "/legal/privacidad", "/legal/retracto", "/seguros/carro", "/seguros/moto", ...modelPages().map(modelPath)].map(
    (p) => ({ url: `${BASE}${p}`, changeFrequency: "weekly", priority: p === "" ? 1 : 0.6 }),
  );
}
