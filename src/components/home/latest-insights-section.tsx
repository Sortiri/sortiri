"use client";

import Link from "next/link";
import { InsightsFindingCard } from "@/components/insights/insights-finding-card";
import type { InsightFindingDetail } from "@/types/insights";
import "./home.css";

type LatestInsightsSectionProps = {
  findings: InsightFindingDetail[];
  hasCompletedRun: boolean;
};

export function LatestInsightsSection({
  findings,
  hasCompletedRun,
}: LatestInsightsSectionProps) {
  return (
    <section className="home-section">
      <div className="home-section__header">
        <h2 className="home-section__title">Latest Insights</h2>
        <Link href="/insights" className="home-section__link">
          View Insights
        </Link>
      </div>
      {!hasCompletedRun ? (
        <p className="home-section__empty">
          No insight report yet. Generate a report to find hotspots, risks, and
          patterns.{" "}
          <Link href="/insights" className="home-section__link">
            Generate Insight Report
          </Link>
        </p>
      ) : findings.length === 0 ? (
        <p className="home-section__empty">No findings in the latest report.</p>
      ) : (
        <div className="home-findings">
          {findings.map((finding) => (
            <InsightsFindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      )}
    </section>
  );
}
