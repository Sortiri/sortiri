"use client";

import { formatEventTime } from "@/lib/events/format";
import type { InsightRun } from "@/types/insights";
import "./insights.css";

type InsightsReportProps = {
  run: InsightRun;
};

function formatWindow(run: InsightRun): string {
  const start = formatEventTime(run.windowStart);
  const end = formatEventTime(run.windowEnd);
  return `${start} – ${end}`;
}

export function InsightsReport({ run }: InsightsReportProps) {
  if (run.status !== "completed") {
    return null;
  }

  return (
    <section className="insights-report">
      <p className="insights-report__label">Latest Insight Report</p>
      <h2 className="insights-report__title">{run.title}</h2>
      <p className="insights-report__meta">
        Generated {formatEventTime(run.createdAt)} · Window: {formatWindow(run)}
      </p>
      {run.summary ? (
        <p className="insights-report__summary">{run.summary}</p>
      ) : null}
    </section>
  );
}
