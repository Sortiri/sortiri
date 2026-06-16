"use client";

import { useQuery } from "convex/react";
import { Suspense } from "react";
import { api } from "../../../convex/_generated/api";
import { IntelligenceEmptyState } from "@/components/intelligence/intelligence-empty-state";
import { IntelligenceQuickActions } from "@/components/intelligence/intelligence-quick-actions";
import { IntelligenceAgentContextSection } from "@/components/context/intelligence-agent-context-section";
import { IntelligencePrivateEvalsSection } from "@/components/evals/intelligence-private-evals-section";
import { IntelligenceAutonomyQueueSection } from "@/components/recommendations/intelligence-autonomy-queue-section";
import {
  IntelligenceRecentActivity,
  mapHubActivity,
} from "@/components/intelligence/intelligence-recent-activity";
import {
  IntelligenceSummaryCards,
  mapHubSummaries,
} from "@/components/intelligence/intelligence-summary-cards";
import { IntelligenceTabs, useIntelligenceTab } from "@/components/intelligence/intelligence-tabs";
import { useWorkspace } from "@/components/workspace/workspace-context";
import "./intelligence.css";

function IntelligencePageContent() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const activeTab = useIntelligenceTab();

  const hub = useQuery(
    api.intelligenceHub.getHub,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip",
  );

  const loading = wsLoading || (activeWorkspaceId !== null && hub === undefined);

  if (loading) {
    return (
      <div className="intelligence-page">
        <p className="intelligence-page__loading">Loading intelligence…</p>
      </div>
    );
  }

  const summaries = mapHubSummaries(hub?.summaries ?? []);
  const recentActivity = mapHubActivity(hub?.recentActivity ?? []);
  const isEmpty = hub?.isEmpty ?? true;

  return (
    <div className="intelligence-page">
      <header className="intelligence-page__header">
        <h1 className="intelligence-page__title">Intelligence</h1>
        <p className="intelligence-page__subtitle">
          Understand what changed, what worked, what failed, and what to do next.
        </p>
      </header>

      {isEmpty ? <IntelligenceEmptyState /> : null}

      <IntelligenceSummaryCards summaries={summaries} activeTab={activeTab} />
      <IntelligenceTabs activeTab={activeTab} />
      <IntelligenceRecentActivity items={recentActivity} activeTab={activeTab} />
      {activeWorkspaceId ? (
        <>
          <IntelligenceAutonomyQueueSection
            workspaceId={activeWorkspaceId}
            queueSummary={
              hub?.queueSummary ?? { openCount: 0, criticalHighCount: 0 }
            }
            recentRecommendations={hub?.recentRecommendations ?? []}
          />
          <IntelligencePrivateEvalsSection
            evalSummary={hub?.evalSummary ?? { activeCount: 0 }}
            remediationSummary={
              hub?.remediationSummary ?? {
                openCount: 0,
                failedEvalsNeedingAction: 0,
                rerunsPassed: 0,
                rerunsStillFailing: 0,
              }
            }
            recentEvalSuites={hub?.recentEvalSuites ?? []}
          />
          <IntelligenceAgentContextSection
            workspaceId={activeWorkspaceId}
            recentPacks={hub?.recentContextPacks ?? []}
          />
        </>
      ) : null}
      <IntelligenceQuickActions />
    </div>
  );
}

export function IntelligencePage() {
  return (
    <Suspense
      fallback={
        <div className="intelligence-page">
          <p className="intelligence-page__loading">Loading intelligence…</p>
        </div>
      }
    >
      <IntelligencePageContent />
    </Suspense>
  );
}
