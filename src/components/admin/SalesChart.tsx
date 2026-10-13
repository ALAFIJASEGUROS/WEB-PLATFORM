"use client";

import { useState } from "react";
import type { DailySales } from "@/domain/admin";
import { formatCOP } from "@/domain/labels";

const W = 640;
const H = 200;
const PAD = { top: 12, right: 8, bottom: 24, left: 8 };
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const shortDate = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

/** Barra con la punta redondeada (4px) y la base recta sobre el eje. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Recaudo por día: una sola serie, barras finas, tooltip por barra y tabla equivalente. */
export function SalesChart({ days }: { days: DailySales[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...days.map((d) => d.revenue), 1);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / days.length;
  const barW = Math.max(2, slot - 2); // 2px de separación entre barras
  const total = days.reduce((s, d) => s + d.revenue, 0);
  const issued = days.reduce((s, d) => s + d.issued, 0);
  const a = active !== null ? days[active] : null;

  return (
    <figure className="space-y-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-bold text-heading">Recaudo de pólizas emitidas · últimos {days.length} días</span>
        <span className="text-sm text-muted">
          <strong className="text-heading tabular-nums">{formatCOP(total)}</strong> · {issued} pólizas
        </span>
      </figcaption>
      <div className="relative" onMouseLeave={() => setActive(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Recaudo de pólizas emitidas por día, últimos ${days.length} días. Total ${formatCOP(total)}. La tabla de abajo tiene los valores.`}>
          <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke="var(--color-line)" />
          <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top} y2={PAD.top} stroke="var(--color-line)" strokeDasharray="2 4" />
          {days.map((d, i) => {
            const h = (d.revenue / max) * plotH;
            const x = PAD.left + i * slot + 1;
            return (
              <g key={d.date}>
                {h > 0 && (
                  <path d={barPath(x, PAD.top + plotH - h, barW, h)} fill="var(--color-brand)" opacity={active === null || active === i ? 1 : 0.45} />
                )}
                {/* Zona de interacción más grande que la barra. */}
                <rect
                  x={PAD.left + i * slot}
                  y={PAD.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${shortDate(d.date)}: ${formatCOP(d.revenue)}, ${d.issued} pólizas, ${d.orders} órdenes`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="outline-none focus-visible:fill-[var(--color-brand-soft)]"
                />
              </g>
            );
          })}
          {[0, Math.floor(days.length / 2), days.length - 1].map((i) => (
            <text key={i} x={PAD.left + i * slot + slot / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--color-muted)">
              {shortDate(days[i].date)}
            </text>
          ))}
        </svg>
        {a && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lg"
            style={{ left: `${((PAD.left + active! * slot + slot / 2) / W) * 100}%` }}
          >
            <p className="font-semibold text-heading">{shortDate(a.date)}</p>
            <p className="tabular-nums text-ink">{formatCOP(a.revenue)}</p>
            <p className="text-muted">{a.issued} pólizas · {a.orders} órdenes</p>
          </div>
        )}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-brand">Ver tabla</summary>
        <div className="mt-2 max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr><th scope="col" className="py-1">Día</th><th scope="col" className="py-1 text-right">Órdenes</th><th scope="col" className="py-1 text-right">Pólizas</th><th scope="col" className="py-1 text-right">Recaudo</th></tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date} className="border-t border-line">
                  <td className="py-1">{d.date}</td>
                  <td className="py-1 text-right tabular-nums">{d.orders}</td>
                  <td className="py-1 text-right tabular-nums">{d.issued}</td>
                  <td className="py-1 text-right tabular-nums">{formatCOP(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
