"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { RecommendationCard } from "@/components/recommendations/recommendation-card";
import { RecommendationFilters } from "@/components/recommendations/recommendation-filters";
import { PageLoader } from "@/components/ui/page-loader";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import type {
  RecommendationQueueFilters,
  RecommendationRecord,
} from "@/types/recommendations";
import "./recommendations.css";

export function AutonomyQueuePage() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;
  const generate = useMutation(api.recommendations.generateForWorkspace);
  const [filters, setFilters] = useState<RecommendationQueueFilters>({ status: "open" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recommendations = useQuery(
    api.recommendations.listByWorkspace,
    activeWorkspaceId
      ? {
          workspaceId: activeWorkspaceId,
          status: filters.status === "all" ? undefined : filters.status,
          priority: filters.priority === "all" ? undefined : filters.priority,
          source: filters.source === "all" ? undefined : filters.source,
          limit: 100,
        }
      : "skip",
  );

  const filtered = useMemo(() => {
    const list = (recommendations ?? []) as RecommendationRecord[];
    return list;
  }, [recommendations]);

  const loading = wsLoading || (activeWorkspaceId !== null && recommendations === undefined);

  const handleGenerate = async () => {
    if (!activeWorkspaceId) return;
    setBusy(true);
    setError(null);
    try {
      await generate({ workspaceId: activeWorkspaceId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate recommendations");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="recommendations-page">
      <header className="recommendations-page__header">
        <Link href="/intelligence">← Back to Intelligence</Link>
        <h1 className="recommendations-page__title">Autonomy Queue</h1>
        <p className="recommendations-page__subtitle">
          Evidence-backed recommended work from insights, impact, lessons, failures, and source
          health.
        </p>
        {canWrite && activeWorkspaceId ? (
          <div className="recommendations-page__actions">
            <button
              type="button"
              className="recommendations-btn recommendations-btn--primary"
              onClick={() => void handleGenerate()}
              disabled={busy}
            >
              {busy ? "Generating…" : "Generate Recommendations"}
            </button>
          </div>
        ) : null}
        {error ? <p className="recommendations-page__subtitle">{error}</p> : null}
      </header>

      <RecommendationFilters filters={filters} onChange={setFilters} />

      {loading ? <PageLoader variant="inline" /> : null}
      {!loading && filtered.length === 0 ? (
        <p className="recommendations-page__subtitle">No recommendations match these filters.</p>
      ) : null}

      <div className="recommendations-list">
        {filtered.map((recommendation) => (
          <RecommendationCard key={recommendation.id} recommendation={recommendation} />
        ))}
      </div>
    </div>
  );
}
