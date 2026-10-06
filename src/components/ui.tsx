import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "accent";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-strong disabled:bg-brand/40",
  secondary:
    "bg-surface text-heading border-2 border-line hover:border-brand disabled:opacity-50",
  ghost: "text-heading hover:bg-brand-soft",
  accent: "bg-sun text-[#10213f] hover:brightness-95",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 min-h-12 font-semibold text-base transition active:scale-[0.98] disabled:cursor-not-allowed";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return (
    <Link className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}

export function Card({
  className = "",
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)] ${className}`}
      {...props}
    />
  );
}

const badgeTones = {
  brand: "bg-brand-soft text-brand-strong",
  mint: "bg-mint-soft text-mint",
  sun: "bg-sun-soft text-sun-ink",
  coral: "bg-coral-soft text-coral",
  neutral: "bg-canvas text-muted",
} as const;

export function Badge({
  tone = "brand",
  children,
}: {
  tone?: keyof typeof badgeTones;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-heading">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-coral">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "w-full min-h-12 rounded-2xl border-2 border-line bg-surface px-4 text-base text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none aria-[invalid=true]:border-coral";

/**
 * Distintivo de la aseguradora con sus colores. No usa logotipos registrados:
 * se reemplazan por los oficiales cuando haya convenio y autorización de marca.
 */
const INSURER_STYLE: Record<string, { bg: string; short: string }> = {
  sura: { bg: "from-[#0033a0] to-[#2f63d6]", short: "SURA" },
  bolivar: { bg: "from-[#00843d] to-[#2bb36a]", short: "Bolívar" },
};

export function InsurerLogo({ id, name }: { id: string; name: string }) {
  const style = INSURER_STYLE[id];
  const short = style?.short ?? name.replace("Seguros ", "").slice(0, 7);
  return (
    <div
      aria-hidden
      title={name}
      className={`flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br px-1 text-center font-extrabold leading-none tracking-tight text-white shadow-inner ring-1 ring-black/5 ${style?.bg ?? "from-navy to-brand"} ${short.length > 4 ? "text-[10px]" : "text-xs"}`}
    >
      {short}
    </div>
  );
}

export function SimulatedDataNotice() {
  return (
    <p className="rounded-xl bg-sun-soft px-3 py-2 text-xs text-sun-ink">
      Demo: precios, planes y condiciones son simulados y no corresponden a la
      oferta real de las aseguradoras.
    </p>
  );
}
