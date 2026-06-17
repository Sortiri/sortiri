"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { WorkspaceHeader } from "@/components/platform";
import { ActiveProjectsSection } from "@/components/home/active-projects-section";
import { HomeEmptyState } from "@/components/home/home-empty-state";
import { HomeNeedsAttention } from "@/components/home/home-needs-attention";
import { HomePulseCards } from "@/components/home/home-pulse-cards";
import { QuickActions } from "@/components/home/quick-actions";
import { RecentHistorySection } from "@/components/home/recent-history-section";
import { SourceHealthSection } from "@/components/home/source-health-section";
import { PageLoader } from "@/components/ui/page-loader";
import { useWorkspace } from "@/components/workspace/workspace-context";
import type { CompanyPulse, SourceHealthItem } from "@/types/home";
import type { TimelineEvent } from "@/types/events";
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
        <PageLoader variant="inline" />
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
  const subtitle = data.scopedAccess
    ? "A live summary of your timeline, workstreams, sources, and insights. Showing activity you have access to."
    : "A live summary of your timeline, workstreams, sources, and insights.";

  return (
    <div className="home-page">
      <WorkspaceHeader subtitle={subtitle} />
      <HomePulseCards counts={data.counts} />

      {data.isEmpty ? <HomeEmptyState /> : null}

      <QuickActions />

      {!data.isEmpty ? (
        <>
          <ActiveProjectsSection workspaceId={activeWorkspaceId} />
          <HomeNeedsAttention workspaceId={activeWorkspaceId} />
          <RecentHistorySection events={data.recentEvents as TimelineEvent[]} />
        </>
      ) : null}

      <SourceHealthSection
        compact
        sourceStatus={data.sourceStatus as SourceHealthItem[]}
      />
    </div>
  );
}
