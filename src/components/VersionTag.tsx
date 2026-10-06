/** Versión desplegada: permite verificar de un vistazo qué build está en línea. */
export function VersionTag() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
  const sha = process.env.NEXT_PUBLIC_COMMIT_SHA ?? "local";
  const date = process.env.NEXT_PUBLIC_BUILD_DATE ?? "";
  const target = process.env.NEXT_PUBLIC_DEPLOY_TARGET ?? "";
  return (
    <p className="font-mono text-[11px] text-muted" title={`Build ${date} · ${target}`}>
      <span data-testid="app-version">v{version}</span> · {sha} · {target}
    </p>
  );
}
