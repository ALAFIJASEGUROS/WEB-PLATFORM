import type { Metadata } from "next";
import { ResultsView } from "@/components/results/ResultsView";

export const metadata: Metadata = {
  title: "Tus opciones",
  robots: { index: false },
};

export default function Page() {
  return <ResultsView />;
}
