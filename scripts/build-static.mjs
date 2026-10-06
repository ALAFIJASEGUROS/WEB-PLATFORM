// Genera la demo estática (GitHub Pages) en ./out.
// Copia el proyecto a .static-build/, quita las rutas que necesitan servidor,
// pone encima las páginas de static-demo/ y exporta con `output: "export"`.
//
// Uso: BASE_PATH=/WEB-PLATFORM node scripts/build-static.mjs
import { execSync } from "node:child_process";
import { cpSync, existsSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const build = join(root, ".static-build");
const basePath = process.env.BASE_PATH ?? "";

rmSync(build, { recursive: true, force: true });
cpSync(join(root, "src"), join(build, "src"), { recursive: true });
cpSync(join(root, "public"), join(build, "public"), { recursive: true });
for (const f of ["package.json", "tsconfig.json", "postcss.config.mjs"]) {
  cpSync(join(root, f), join(build, f));
}
symlinkSync(join(root, "node_modules"), join(build, "node_modules"), "dir");

const SERVER_ROUTES = ["api", "admin", "cuenta", "checkout", "pago", "poliza", "pqr"];
for (const r of SERVER_ROUTES) rmSync(join(build, "src/app", r), { recursive: true, force: true });
// Código que solo usan las rutas de servidor.
for (const d of ["src/server", "src/components/account"]) rmSync(join(build, d), { recursive: true, force: true });
cpSync(join(root, "static-demo/app"), join(build, "src/app"), { recursive: true });

writeFileSync(
  join(build, "next.config.ts"),
  `import type { NextConfig } from "next";
const config: NextConfig = {
  output: "export",
  basePath: ${JSON.stringify(basePath)},
  trailingSlash: true,
  images: { unoptimized: true },
};
export default config;
`,
);

execSync("npx next build", {
  cwd: build,
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_STATIC_DEMO: "1", NEXT_PUBLIC_SITE_URL: process.env.SITE_URL ?? "" },
});

const out = join(root, "out");
rmSync(out, { recursive: true, force: true });
cpSync(join(build, "out"), out, { recursive: true });
writeFileSync(join(out, ".nojekyll"), "");
if (!existsSync(join(out, "index.html"))) throw new Error("No se generó index.html");
console.log(`Demo estática lista en ${out}`);
