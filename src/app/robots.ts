import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://segualafija.co";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/cuenta", "/checkout", "/pago", "/poliza"] },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
