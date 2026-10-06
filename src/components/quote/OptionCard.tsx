import type { ReactNode } from "react";

export function OptionGroup({
  legend,
  children,
  description,
}: {
  legend: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-base font-bold text-navy">{legend}</legend>
      {description && <p className="-mt-1 text-sm text-muted">{description}</p>}
      <div className="grid gap-2.5">{children}</div>
    </fieldset>
  );
}

export function OptionCard({
  name,
  checked,
  onChange,
  title,
  description,
  icon,
  type = "radio",
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  type?: "radio" | "checkbox";
}) {
  return (
    <label
      className={`flex min-h-14 cursor-pointer items-center gap-4 rounded-2xl border-2 bg-white p-4 transition has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-brand ${
        checked ? "border-brand bg-brand-soft" : "border-line hover:border-brand/50"
      }`}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {icon && (
        <span className={`shrink-0 ${checked ? "text-brand" : "text-muted"}`}>{icon}</span>
      )}
      <span className="flex-1">
        <span className="block font-semibold text-navy">{title}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </span>
      <span
        aria-hidden
        className={`flex size-5 shrink-0 items-center justify-center border-2 ${type === "radio" ? "rounded-full" : "rounded-md"} ${
          checked ? "border-brand bg-brand" : "border-line bg-white"
        }`}
      >
        {checked && <span className={`size-2 bg-white ${type === "radio" ? "rounded-full" : "rounded-sm"}`} />}
      </span>
    </label>
  );
}
