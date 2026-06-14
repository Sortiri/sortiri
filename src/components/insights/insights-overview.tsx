"use client";

import type { InsightOverview } from "@/types/insights";
import "./insights.css";

type InsightsOverviewProps = {
  overview: InsightOverview;
};

const CARDS: {
  label: string;
  getValue: (overview: InsightOverview) => number;
}[] = [
  { label: "Events", getValue: (o) => o.totalEvents },
  { label: "Agent Actions", getValue: (o) => o.agentActions },
  { label: "Code Changes", getValue: (o) => o.codeChanges },
  { label: "Product Events", getValue: (o) => o.productEvents },
  { label: "Decisions", getValue: (o) => o.decisions },
  { label: "Active Workstreams", getValue: (o) => o.activeWorkstreams },
];

export function InsightsOverviewCards({ overview }: InsightsOverviewProps) {
  return (
    <div className="insights-overview">
      {CARDS.map((card) => (
        <article key={card.label} className="insights-overview__card">
          <p className="insights-overview__label">{card.label}</p>
          <p className="insights-overview__value">{card.getValue(overview)}</p>
        </article>
      ))}
    </div>
  );
}
