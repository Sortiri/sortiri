"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import "./recommendations.css";

type IntelligenceAutonomyQueueSectionProps = {
  workspaceId: string;
  queueSummary: {
    openCount: number;
    criticalHighCount: number;
    latestTitle?: string;
    latestAt?: number;
  };
  recentRecommendations: Array<{
    id: string;
    title: string;
    summary: string;
    priority: string;
    createdAt: number;
  }>;
};

export function IntelligenceAutonomyQueueSection({
  workspaceId,
  queueSummary,
  recentRecommendations,
}: IntelligenceAutonomyQueueSectionProps) {
  const generate = useMutation(api.recommendations.generateForWorkspace);
  const [busy, setBusy] = useState(false);

  const handleGenerate = async () => {
    setBusy(true);
    try {
      await generate({ workspaceId });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="recommendation-hub-section">
      <h2 className="recommendation-hub-section__title">Autonomy Queue</h2>
      <p className="recommendations-page__subtitle">
        {queueSummary.openCount} open recommendation{queueSummary.openCount === 1 ? "" : "s"}
        {queueSummary.criticalHighCount > 0
          ? ` · ${queueSummary.criticalHighCount} critical/high`
          : ""}
        {queueSummary.latestTitle ? ` · Latest: ${queueSummary.latestTitle}` : ""}
      </p>
      <div className="recommendations-page__actions">
        <Link href="/intelligence/queue" className="recommendations-btn">
          Open Queue
        </Link>
        <button
          type="button"
          className="recommendations-btn recommendations-btn--primary"
          onClick={() => void handleGenerate()}
          disabled={busy}
        >
          {busy ? "Generating…" : "Generate Recommendations"}
        </button>
      </div>
      {recentRecommendations.length > 0 ? (
        <ul className="recommendation-hub-section__list">
          {recentRecommendations.map((rec) => (
            <li key={rec.id}>
              <Link href={`/recommendations/${rec.id}`}>{rec.title}</Link>
              <span className="recommendations-page__subtitle"> — {rec.priority}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="recommendations-page__subtitle">No open recommendations yet.</p>
      )}
    </section>
  );
}
