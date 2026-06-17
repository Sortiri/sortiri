"use client";

import Link from "next/link";
import { useAction, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { InsightsEmptyState } from "@/components/insights/insights-empty-state";
import { InsightsFindingCard } from "@/components/insights/insights-finding-card";
import { InsightsOverviewCards } from "@/components/insights/insights-overview";
import { InsightsReport } from "@/components/insights/insights-report";
import { InsightsWindowFilter } from "@/components/insights/insights-window-filter";
import { GenerateRelatedHistoryButton } from "@/components/links/generate-related-history-button";
import { ProjectFilter } from "@/components/projects/project-filter";
import { ViewFilter } from "@/components/views/view-filter";
import { useProjectFilter } from "@/hooks/use-project-filter";
import { useViewFilter } from "@/hooks/use-view-filter";
import { PageLoader } from "@/components/ui/page-loader";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import type { InsightWindow } from "@/types/insights";
import "./insights.css";

const ASK_CTA_QUESTION =
  "What are the most important things in the latest insight report?";

export function InsightsPage() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;
  const { projectId, projectList, setProjectId } = useProjectFilter(activeWorkspaceId);
  const { viewId, setViewId } = useViewFilter();
  const [window, setWindow] = useState<InsightWindow>("7d");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const overview = useQuery(
    api.insights.getOverview,
    activeWorkspaceId
      ? { workspaceId: activeWorkspaceId, window, projectId, viewId }
      : "skip",
  );

  const runs = useQuery(
    api.insights.listRuns,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId, limit: 5 } : "skip",
  );

  const latestRun = runs?.find((run) => run.status === "completed") ?? runs?.[0];
  const displayRunId = activeRunId ?? latestRun?.id;

  const findings = useQuery(
    api.insights.listFindingsByRun,
    displayRunId ? { runId: displayRunId as Id<"insightRuns"> } : "skip",
  );

  const displayRun = useQuery(
    api.insights.getRun,
    displayRunId ? { runId: displayRunId as Id<"insightRuns"> } : "skip",
  );

  const generateRun = useAction(api.insights.generateRun);

  const handleGenerate = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setError(null);
    setGenerating(true);
    try {
      const result = await generateRun({
        workspaceId: activeWorkspaceId,
        window,
        projectId,
        viewId,
      });
      setActiveRunId(result.runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate insight report");
    } finally {
      setGenerating(false);
    }
  }, [activeWorkspaceId, generateRun, window, projectId, viewId]);

  const loading =
    wsLoading ||
    (activeWorkspaceId !== null && (overview === undefined || runs === undefined));

  const hasEvents = (overview?.totalEvents ?? 0) > 0;
  const hasCompletedRun = latestRun?.status === "completed";
  const showNoEvents = !loading && !hasEvents;
  const showNoReport = !loading && hasEvents && !hasCompletedRun && !generating;
  const showNoFindings =
    !loading &&
    hasCompletedRun &&
    findings !== undefined &&
    findings.length === 0 &&
    !generating;

  return (
    <div className="insights-page">
      <header className="insights-page__header">
        <div className="insights-page__header-row">
          <div>
            <h1 className="insights-page__title">Insights</h1>
            <p className="insights-page__subtitle">
              Signals Sortiri found across your company timeline.
            </p>
          </div>
          {hasCompletedRun ? (
            <Link
              href={`/ask?q=${encodeURIComponent(ASK_CTA_QUESTION)}`}
              className="insights-page__ask-link"
            >
              Ask about these insights
            </Link>
          ) : null}
        </div>
      </header>

      {loading ? <PageLoader variant="inline" /> : null}
      {error ? <p className="insights-page__error">{error}</p> : null}

      <InsightsWindowFilter value={window} onChange={setWindow} />
      {projectList.length > 0 ? (
        <ProjectFilter
          projects={projectList}
          value={projectId ?? null}
          onChange={setProjectId}
        />
      ) : null}
      <ViewFilter value={viewId ?? null} onChange={setViewId} />

      {overview ? <InsightsOverviewCards overview={overview} /> : null}

      <div className="insights-generate">
        <button
          type="button"
          className="insights-generate__button"
          onClick={() => void handleGenerate()}
          disabled={!activeWorkspaceId || generating || !hasEvents || !canWrite}
        >
          {generating ? "Reading timeline…" : "Generate Insight Report"}
        </button>
        {!canWrite ? (
          <p className="insights-generate__status">Viewer access cannot generate reports.</p>
        ) : null}
        {generating ? (
          <p className="insights-generate__status">Reading timeline…</p>
        ) : null}
        {activeWorkspaceId ? (
          <GenerateRelatedHistoryButton
            workspaceId={activeWorkspaceId}
            defaultWindow={window}
            compact
          />
        ) : null}
      </div>

      {showNoEvents ? <InsightsEmptyState variant="no-events" /> : null}
      {showNoReport ? <InsightsEmptyState variant="no-report" /> : null}

      {displayRun ? <InsightsReport run={displayRun} /> : null}

      {findings && findings.length > 0 ? (
        <section className="insights-findings">
          <h2 className="insights-findings__title">Findings</h2>
          {findings.map((finding) => (
            <InsightsFindingCard key={finding.id} finding={finding} />
          ))}
        </section>
      ) : null}

      {showNoFindings ? <InsightsEmptyState variant="no-findings" /> : null}
    </div>
  );
}
