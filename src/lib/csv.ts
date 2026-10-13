// CSV para Excel en español: separador ";" (la coma es el separador decimal),
// BOM para que reconozca UTF-8 y comillas cuando hacen falta.

export type CsvValue = string | number | boolean | null | undefined;

const cell = (v: CsvValue) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Evita que Excel interprete texto como fórmula (inyección CSV).
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCsv(rows: Record<string, CsvValue>[], columns?: { key: string; label: string }[]) {
  const cols = columns ?? Object.keys(rows[0] ?? {}).map((k) => ({ key: k, label: k }));
  const lines = [cols.map((c) => cell(c.label)).join(";"), ...rows.map((r) => cols.map((c) => cell(r[c.key])).join(";"))];
  return `﻿${lines.join("\r\n")}\r\n`;
}
