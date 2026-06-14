import type { Metadata } from "next";
import { InsightsPage } from "@/components/insights/insights-page";

export const metadata: Metadata = {
  title: "Insights — Sortiri Timeline",
};

export default function InsightsRoutePage() {
  return <InsightsPage />;
}
