"use client";

import type { ViewPulseCounts } from "@/types/saved-views";
import "./views.css";

const PULSE_CARDS: { label: string; key: keyof ViewPulseCounts }[] = [
  { label: "Events", key: "totalEvents" },
  { label: "Agent Actions", key: "agentActions" },
  { label: "Code Changes", key: "codeChanges" },
  { label: "Product Events", key: "productEvents" },
  { label: "Decisions", key: "decisions" },
  { label: "Revenue", key: "revenueEvents" },
];

type ViewPulseProps = {
  counts: ViewPulseCounts;
};

export function ViewPulse({ counts }: ViewPulseProps) {
  return (
    <div className="pulse-summary">
      {PULSE_CARDS.map((card) => (
        <article key={card.key} className="pulse-summary__card">
          <p className="pulse-summary__label">{card.label}</p>
          <p className="pulse-summary__value">{counts[card.key]}</p>
        </article>
      ))}
    </div>
  );
}
