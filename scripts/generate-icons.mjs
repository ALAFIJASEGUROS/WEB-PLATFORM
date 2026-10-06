// Genera los íconos PNG de la PWA a partir de SVG con el Chromium de Playwright.
// Uso: node scripts/generate-icons.mjs (PW_CHROMIUM_PATH opcional).
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = readFileSync("public/icon.svg", "utf8");
// Versión "maskable": fondo a sangre y el escudo dentro de la zona segura (80%).
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="#0B3D91"/><g transform="translate(6 6) scale(0.75)"><path d="M24 6L10 13v12c0 8 7 14 14 16 7-2 14-8 14-16V13L24 6z" fill="#fff"/><path d="M17 24l5 5 9-10" stroke="#0d7563" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g></svg>`;

const targets = [
  { file: "public/icon-192.png", svg: base, size: 192 },
  { file: "public/icon-512.png", svg: base, size: 512 },
  { file: "public/icon-maskable-512.png", svg: maskable, size: 512 },
  { file: "src/app/apple-icon.png", svg: maskable, size: 180 },
];

const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const page = await browser.newPage();
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  const svg = t.svg.replace("<svg ", `<svg width="${t.size}" height="${t.size}" `);
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.screenshot({ path: t.file, omitBackground: true, clip: { x: 0, y: 0, width: t.size, height: t.size } });
  console.log(`✓ ${t.file}`);
}
await browser.close();
