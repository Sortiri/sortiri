"use client";

import Link from "next/link";
import type { IntelligenceAreaSummary, IntelligenceTab } from "@/types/intelligence-hub";
import {
  INTELLIGENCE_TAB_DESCRIPTIONS,
  INTELLIGENCE_TAB_HREFS,
  INTELLIGENCE_TAB_LABELS,
} from "@/types/intelligence-hub";
import "./intelligence.css";

type IntelligenceSummaryCardsProps = {
  summaries: IntelligenceAreaSummary[];
  activeTab: IntelligenceTab;
};

export function IntelligenceSummaryCards({
  summaries,
  activeTab,
}: IntelligenceSummaryCardsProps) {
  return (
    <div className="intelligence-summary">
      {summaries.map((summary) => (
        <article
          key={summary.tab}
          className={`intelligence-summary__card${summary.tab === activeTab ? " is-active" : ""}`}
        >
          <p className="intelligence-summary__label">{summary.label}</p>
          <p className="intelligence-summary__count">
            {summary.count} {summary.countLabel}
          </p>
          <p className="intelligence-summary__description">{summary.description}</p>
          {summary.latestTitle ? (
            <p className="intelligence-summary__latest">Latest: {summary.latestTitle}</p>
          ) : null}
          <Link href={summary.href} className="intelligence-summary__link">
            Open {INTELLIGENCE_TAB_LABELS[summary.tab]}
          </Link>
        </article>
      ))}
    </div>
  );
}

export function mapHubSummaries(
  summaries: Array<{
    tab: IntelligenceTab;
    count: number;
    countLabel: string;
    latestTitle?: string;
    latestAt?: number;
  }>,
): IntelligenceAreaSummary[] {
  return summaries.map((summary) => ({
    tab: summary.tab,
    label: INTELLIGENCE_TAB_LABELS[summary.tab],
    count: summary.count,
    countLabel: summary.countLabel,
    description: INTELLIGENCE_TAB_DESCRIPTIONS[summary.tab],
    href: INTELLIGENCE_TAB_HREFS[summary.tab],
    latestTitle: summary.latestTitle,
    latestAt: summary.latestAt,
  }));
}
