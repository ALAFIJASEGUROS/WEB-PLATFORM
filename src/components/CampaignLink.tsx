"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { track } from "@/lib/analytics";

/** Enlace de una campaña que registra el clic (para las métricas del anunciante). */
export function CampaignLink({ campaignId, href, className, children }: { campaignId: string; href: string; className?: string; children: ReactNode }) {
  const onClick = () => track("campana_clic", { campana: campaignId });
  return href.startsWith("/") ? (
    <Link href={href} onClick={onClick} className={className}>{children}</Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={className}>{children}</a>
  );
}
