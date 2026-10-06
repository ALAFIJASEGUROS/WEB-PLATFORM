import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "accent";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-strong disabled:bg-brand/40",
  secondary:
    "bg-white text-navy border-2 border-line hover:border-brand disabled:opacity-50",
  ghost: "text-navy hover:bg-brand-soft",
  accent: "bg-sun text-navy hover:brightness-95",
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
  sun: "bg-sun-soft text-[#8a5a00]",
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
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-navy">
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
  "w-full min-h-12 rounded-2xl border-2 border-line bg-white px-4 text-base text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none aria-[invalid=true]:border-coral";

export function InsurerLogo({ id, name }: { id: string; name: string }) {
  const styles: Record<string, string> = {
    sura: "bg-[#0033a0] text-white",
    bolivar: "bg-[#00843d] text-white",
  };
  const initials = name
    .replace("Seguros ", "")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      aria-hidden
      className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${styles[id] ?? "bg-navy text-white"}`}
    >
      {initials}
    </div>
  );
}

export function SimulatedDataNotice() {
  return (
    <p className="rounded-xl bg-sun-soft px-3 py-2 text-xs text-[#8a5a00]">
      Demo: precios, planes y condiciones son simulados y no corresponden a la
      oferta real de las aseguradoras.
    </p>
  );
}
