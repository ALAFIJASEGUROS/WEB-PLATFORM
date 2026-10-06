// Información de la versión desplegada, inyectada en tiempo de build como
// variables NEXT_PUBLIC_* y visible en el footer (control visual de despliegue).
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

function gitSha() {
  try {
    return execSync("git rev-parse HEAD", { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

/** @param {"servidor" | "pages"} target */
export function buildEnv(target) {
  const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || gitSha() || "local";
  return {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_COMMIT_SHA: sha.slice(0, 7),
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
    NEXT_PUBLIC_DEPLOY_TARGET: process.env.VERCEL_ENV ? `vercel-${process.env.VERCEL_ENV}` : target,
  };
}
