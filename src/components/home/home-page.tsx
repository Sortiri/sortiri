"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ActiveProjectsSection } from "@/components/home/active-projects-section";
import { ActiveWorkstreamsSection } from "@/components/home/active-workstreams-section";
import { HomeEmptyState } from "@/components/home/home-empty-state";
import { LatestInsightsSection } from "@/components/home/latest-insights-section";
import { PinnedReplaysSection } from "@/components/home/pinned-replays-section";
import { PinnedViewsSection } from "@/components/home/pinned-views-section";
import { PulseSummaryCards } from "@/components/home/pulse-summary-cards";
import { QuickActions } from "@/components/home/quick-actions";
import { RecentHistorySection } from "@/components/home/recent-history-section";
import { SourceHealthSection } from "@/components/home/source-health-section";
import { useWorkspace } from "@/components/workspace/workspace-context";
import type { CompanyPulse, PulseCounts, SourceHealthItem } from "@/types/home";
import type { TimelineEvent, Workstream } from "@/types/events";
import type { InsightFindingDetail } from "@/types/insights";
import type { PinnedReplayWithWorkstream } from "@/types/pinned-replays";
import type { PinnedViewSummary } from "@/types/saved-views";
import "./home.css";

export function HomePage() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();

  const pulse = useQuery(
    api.home.getPulse,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip",
  );

  const loading = wsLoading || (activeWorkspaceId !== null && pulse === undefined);

  if (loading) {
    return (
      <div className="home-page">
        <p className="home-page__loading">Loading company pulse…</p>
      </div>
    );
  }

  if (!activeWorkspaceId || !pulse) {
    return (
      <div className="home-page">
        <HomeEmptyState />
      </div>
    );
  }

  const data = pulse as CompanyPulse;

  return (
    <div className="home-page">
      <header className="home-page__header">
        <h1 className="home-page__title">Company Pulse</h1>
        <p className="home-page__subtitle">
          A live summary of your timeline, workstreams, sources, and insights.
          {data.scopedAccess ? " Showing activity you have access to." : ""}
        </p>
      </header>

      {data.isEmpty ? (
        <>
          <HomeEmptyState />
          <PulseSummaryCards counts={data.counts as PulseCounts} />
          <QuickActions />
          <SourceHealthSection sourceStatus={data.sourceStatus as SourceHealthItem[]} />
        </>
      ) : (
        <>
          <PulseSummaryCards counts={data.counts as PulseCounts} />
          <QuickActions />
          <ActiveProjectsSection workspaceId={activeWorkspaceId} />
          <RecentHistorySection events={data.recentEvents as TimelineEvent[]} />
          <ActiveWorkstreamsSection
            workstreams={data.activeWorkstreams as Workstream[]}
            workspaceId={activeWorkspaceId}
          />
          <PinnedReplaysSection
            pinnedReplays={data.pinnedReplays as PinnedReplayWithWorkstream[]}
            workspaceId={activeWorkspaceId}
          />
          <PinnedViewsSection
            pinnedViews={data.pinnedViews as PinnedViewSummary[]}
          />
          <LatestInsightsSection
            findings={data.latestFindings as InsightFindingDetail[]}
            hasCompletedRun={Boolean(data.latestInsightRun)}
          />
          <SourceHealthSection sourceStatus={data.sourceStatus as SourceHealthItem[]} />
        </>
      )}
    </div>
  );
}
