import type { Metadata } from "next";
import { CompareView } from "@/components/results/CompareView";

export const metadata: Metadata = { title: "Comparar", robots: { index: false } };

export default function Page() {
  return <CompareView />;
}
