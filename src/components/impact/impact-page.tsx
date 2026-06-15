"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { CreateImpactAnalysisModal } from "@/components/impact/create-impact-analysis-modal";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import type { ImpactAnalysisRecord } from "@/types/impact-analysis";
import { formatWindowLabel } from "@/lib/impact-window";
import "./impact.css";

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function ImpactPage() {
  const router = useRouter();
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;
  const [showCreate, setShowCreate] = useState(false);

  const analyses = useQuery(
    api.impactAnalyses.listByWorkspace,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip",
  );

  const loading = wsLoading || (activeWorkspaceId !== null && analyses === undefined);
  const analysisList = (analyses ?? []) as ImpactAnalysisRecord[];

  return (
    <div className="impact-page">
      <header className="impact-page__header-row">
        <div>
          <h1 className="impact-page__title">Impact</h1>
          <p className="impact-page__subtitle">
            Before/after analysis for workstreams, PRs, decisions, projects, and product changes.
          </p>
        </div>
        {canWrite && activeWorkspaceId ? (
          <button
            type="button"
            className="impact-page__create-action"
            onClick={() => setShowCreate(true)}
          >
            New Impact Analysis
          </button>
        ) : null}
      </header>

      {loading ? <p className="impact-page__subtitle">Loading impact analyses…</p> : null}

      {!loading && analysisList.length === 0 ? (
        <p className="impact-page__subtitle">
          {canWrite
            ? "No impact analyses yet. Create one from a workstream, event, or this page."
            : "No impact analyses available."}
        </p>
      ) : null}

      {analysisList.length > 0 ? (
        <table className="impact-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Anchor</th>
              <th>Window</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {analysisList.map((analysis) => (
              <tr key={analysis.id}>
                <td>
                  <Link href={`/impact/${analysis.id}`}>{analysis.title}</Link>
                </td>
                <td>
                  {analysis.anchor.type}: {analysis.anchor.title}
                </td>
                <td>
                  {formatWindowLabel(analysis.window.beforeMs, analysis.window.afterMs)}
                </td>
                <td>
                  <span className={`impact-status impact-status--${analysis.status}`}>
                    {analysis.status}
                  </span>
                </td>
                <td>{formatDate(analysis.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {showCreate && activeWorkspaceId ? (
        <CreateImpactAnalysisModal
          workspaceId={activeWorkspaceId}
          onClose={() => setShowCreate(false)}
          onCreated={(analysisId) => router.push(`/impact/${analysisId}`)}
        />
      ) : null}
    </div>
  );
}
