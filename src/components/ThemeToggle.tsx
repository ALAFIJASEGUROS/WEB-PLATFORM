"use client";

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useHydrated } from "@/lib/quote-store";

type Theme = "light" | "dark" | "system";
const KEY = "saf:theme";

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

/** Selector de tema: claro, oscuro o el del sistema. */
export function ThemeToggle() {
  const hydrated = useHydrated();
  const [theme, setTheme] = useState<Theme>(() => (typeof window === "undefined" ? "system" : readTheme()));

  function apply(t: Theme) {
    setTheme(t);
    try {
      if (t === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, t);
    } catch {
      /* sin almacenamiento: solo aplica en esta visita */
    }
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  }

  return (
    <div role="radiogroup" aria-label="Tema" className="inline-flex rounded-full border border-line bg-canvas p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = hydrated && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => apply(value)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${active ? "bg-surface text-heading shadow-sm" : "text-muted hover:text-heading"}`}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
