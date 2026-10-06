import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SeguAlaFija",
    short_name: "SeguAlaFija",
    description: "Compara y compra tu seguro de carro o moto.",
    start_url: "./",
    display: "standalone",
    background_color: "#F7F8FA",
    theme_color: "#0B3D91",
    lang: "es-CO",
    icons: [
      { src: "icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
