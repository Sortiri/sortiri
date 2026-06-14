"use client";

import "./insights.css";

type InsightsEmptyStateProps = {
  variant: "no-events" | "no-findings" | "no-report";
};

const COPY = {
  "no-events": {
    title: "No timeline history yet.",
    body: "Install the Sortiri MCP, run the watcher, or send product events through the SDK to generate insights.",
  },
  "no-findings": {
    title: "No major hotspots yet.",
    body: "Sortiri did not detect repeated work, stale workstreams, errors, or notable product movement in this window.",
  },
  "no-report": {
    title: "Generate your first insight report.",
    body: "Sortiri will scan your timeline and surface hotspots, risks, and patterns.",
  },
} as const;

export function InsightsEmptyState({ variant }: InsightsEmptyStateProps) {
  const content = COPY[variant];

  return (
    <div className="insights-empty-state">
      <p className="insights-empty-state__title">{content.title}</p>
      <p className="insights-empty-state__body">{content.body}</p>
    </div>
  );
}
