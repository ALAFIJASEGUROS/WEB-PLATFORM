import type { ComponentProps } from "react";

/** Campo con apariencia de placa colombiana (fondo amarillo, borde negro). */
export function PlateInput({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <div
      aria-invalid={props["aria-invalid"]}
      className={`relative min-w-0 flex-1 rounded-xl border-[3px] border-[#1a1a1a] bg-[#ffd200] px-3 pb-1 pt-1.5 shadow-[inset_0_0_0_2px_#ffd200,inset_0_0_0_3px_#1a1a1a] focus-within:ring-3 focus-within:ring-brand aria-[invalid=true]:border-coral ${className}`}
    >
      <input
        {...props}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={7}
        className="w-full min-w-0 bg-transparent text-center text-2xl font-black uppercase tracking-[0.25em] text-[#1a1a1a] placeholder:text-[#1a1a1a]/70 focus:outline-none"
      />
      <span aria-hidden className="block text-center text-[10px] font-bold uppercase tracking-[0.3em] text-[#1a1a1a]">
        Colombia
      </span>
    </div>
  );
}
