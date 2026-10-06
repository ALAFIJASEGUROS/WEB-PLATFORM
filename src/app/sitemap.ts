import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://segualafija.co";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/cotizar", "/cotizar/auto", "/cotizar/moto", "/como-funciona", "/ayuda", "/legal/terminos", "/legal/privacidad", "/legal/retracto"].map(
    (p) => ({ url: `${BASE}${p}`, changeFrequency: "weekly", priority: p === "" ? 1 : 0.6 }),
  );
}
