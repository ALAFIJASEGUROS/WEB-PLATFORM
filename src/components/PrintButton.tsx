"use client";

import { Download } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-line px-4 text-sm font-semibold text-heading hover:border-brand print:hidden"
    >
      <Download className="size-4" aria-hidden /> PDF
    </button>
  );
}
