"use client";

import { Download } from "lucide-react";
import { toCsv, type CsvValue } from "@/lib/csv";

/** Descarga un CSV generado en el navegador (demo estática). */
export function CsvDownload({ filename, rows, columns, label = "Exportar CSV" }: {
  filename: string;
  rows: Record<string, CsvValue>[];
  columns: { key: string; label: string }[];
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        const url = URL.createObjectURL(new Blob([toCsv(rows, columns)], { type: "text/csv;charset=utf-8" }));
        const a = Object.assign(document.createElement("a"), { href: url, download: filename });
        a.click();
        URL.revokeObjectURL(url);
      }}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-brand hover:bg-brand-soft"
    >
      <Download className="size-4" aria-hidden /> {label}
    </button>
  );
}
