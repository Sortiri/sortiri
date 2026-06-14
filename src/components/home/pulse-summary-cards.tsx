"use client";

import type { PulseCounts } from "@/types/home";
import "./home.css";

type PulseSummaryCardsProps = {
  counts: PulseCounts;
};

const CARDS: { label: string; key: keyof PulseCounts }[] = [
  { label: "Events Today", key: "eventsToday" },
  { label: "Agent Actions", key: "agentActionsToday" },
  { label: "Code Changes", key: "codeChangesToday" },
  { label: "Product Events", key: "productEventsToday" },
  { label: "Active Workstreams", key: "activeWorkstreams" },
  { label: "Connected Sources", key: "connectedSources" },
];

export function PulseSummaryCards({ counts }: PulseSummaryCardsProps) {
  return (
    <div className="pulse-summary">
      {CARDS.map((card) => (
        <article key={card.key} className="pulse-summary__card">
          <p className="pulse-summary__label">{card.label}</p>
          <p className="pulse-summary__value">{counts[card.key]}</p>
        </article>
      ))}
    </div>
  );
}
