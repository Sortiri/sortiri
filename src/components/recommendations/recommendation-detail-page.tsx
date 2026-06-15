"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import type { RecommendationRecord } from "@/types/recommendations";
import "./recommendations.css";

type RecommendationDetailPageProps = {
  recommendationId: string;
};

function countEvidence(rec: RecommendationRecord): number {
  return (
    (rec.evidenceEventIds?.length ?? 0) +
    (rec.evidenceWorkstreamIds?.length ?? 0) +
    (rec.evidenceEntityIds?.length ?? 0) +
    (rec.evidenceImpactAnalysisIds?.length ?? 0) +
    (rec.evidenceLessonIds?.length ?? 0) +
    (rec.evidencePlaybookIds?.length ?? 0) +
    (rec.evidenceInsightFindingIds?.length ?? 0) +
    (rec.evidenceArtifactIds?.length ?? 0)
  );
}

export function RecommendationDetailPage({ recommendationId }: RecommendationDetailPageProps) {
  const { activeWorkspaceId } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recommendation = useQuery(api.recommendations.getById, {
    recommendationId: recommendationId as Id<"recommendations">,
  }) as RecommendationRecord | undefined;

  const generateContextPack = useMutation(api.recommendations.generateContextPack);
  const convertToWorkstream = useMutation(api.recommendations.convertToWorkstream);
  const generateEvalSuite = useMutation(api.evals.generateFromRecommendation);
  const dismiss = useMutation(api.recommendations.dismiss);
  const archive = useMutation(api.recommendations.archive);

  const runAction = useCallback(
    async (action: () => Promise<unknown>) => {
      setBusy(true);
      setError(null);
      try {
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  if (recommendation === undefined) {
    return <p className="recommendations-page__subtitle">Loading recommendation…</p>;
  }

  if (!recommendation) {
    return (
      <div className="recommendations-page">
        <p>Recommendation not found.</p>
        <Link href="/intelligence/queue">← Back to Autonomy Queue</Link>
      </div>
    );
  }

  const evidenceCount = countEvidence(recommendation);

  return (
    <div className="recommendations-page">
      <Link href="/intelligence/queue">← Back to Autonomy Queue</Link>
      <header className="recommendations-page__header">
        <h1 className="recommendations-page__title">{recommendation.title}</h1>
        <p className="recommendations-page__subtitle">{recommendation.summary}</p>
        <div className="recommendation-card__meta">
          <span className="recommendation-badge">{recommendation.priority}</span>
          <span className="recommendation-badge">{recommendation.source}</span>
          <span className="recommendation-badge">{recommendation.status}</span>
        </div>
        {canWrite ? (
          <div className="recommendations-page__actions">
            <button
              type="button"
              className="recommendations-btn recommendations-btn--primary"
              disabled={busy}
              onClick={() =>
                void runAction(() =>
                  generateContextPack({
                    recommendationId: recommendationId as Id<"recommendations">,
                  }),
                )
              }
            >
              Generate Context Pack
            </button>
            <button
              type="button"
              className="recommendations-btn"
              disabled={busy}
              onClick={() =>
                void runAction(() =>
                  convertToWorkstream({
                    recommendationId: recommendationId as Id<"recommendations">,
                  }),
                )
              }
            >
              Convert to Workstream
            </button>
            <button
              type="button"
              className="recommendations-btn"
              disabled={busy}
              onClick={() =>
                void runAction(() =>
                  generateEvalSuite({
                    recommendationId: recommendationId as Id<"recommendations">,
                  }),
                )
              }
            >
              Generate Eval Suite
            </button>
            <button
              type="button"
              className="recommendations-btn"
              disabled={busy}
              onClick={() =>
                void runAction(() =>
                  dismiss({ recommendationId: recommendationId as Id<"recommendations"> }),
                )
              }
            >
              Dismiss
            </button>
            <button
              type="button"
              className="recommendations-btn"
              disabled={busy}
              onClick={() =>
                void runAction(() =>
                  archive({ recommendationId: recommendationId as Id<"recommendations"> }),
                )
              }
            >
              Archive
            </button>
            <Link
              href={`/ask?recommendationId=${recommendation.id}`}
              className="recommendations-btn"
            >
              Ask about this
            </Link>
          </div>
        ) : null}
        {error ? <p className="recommendations-page__subtitle">{error}</p> : null}
      </header>

      {recommendation.reason ? (
        <section className="recommendation-detail__section">
          <h2 className="recommendation-detail__section-title">Why Sortiri recommends this</h2>
          <p className="recommendations-page__subtitle">{recommendation.reason}</p>
        </section>
      ) : null}

      <section className="recommendation-detail__section">
        <h2 className="recommendation-detail__section-title">Evidence</h2>
        <p className="recommendations-page__subtitle">
          {evidenceCount} linked evidence item{evidenceCount === 1 ? "" : "s"} (filtered to what you
          can access).
        </p>
      </section>

      {recommendation.suggestedWorkstreamTitle || recommendation.suggestedGoal ? (
        <section className="recommendation-detail__section">
          <h2 className="recommendation-detail__section-title">Suggested workstream</h2>
          {recommendation.suggestedWorkstreamTitle ? (
            <p className="recommendations-page__subtitle">{recommendation.suggestedWorkstreamTitle}</p>
          ) : null}
          {recommendation.suggestedGoal ? (
            <p className="recommendations-page__subtitle">Goal: {recommendation.suggestedGoal}</p>
          ) : null}
        </section>
      ) : null}

      {recommendation.recommendedPlaybookId ? (
        <section className="recommendation-detail__section">
          <h2 className="recommendation-detail__section-title">Recommended playbook</h2>
          <Link href={`/playbooks/${recommendation.recommendedPlaybookId}`}>
            Open playbook
          </Link>
        </section>
      ) : null}

      {recommendation.validationRequirements && recommendation.validationRequirements.length > 0 ? (
        <section className="recommendation-detail__section">
          <h2 className="recommendation-detail__section-title">Validation requirements</h2>
          <ul className="recommendation-detail__list">
            {recommendation.validationRequirements.map((req) => (
              <li key={req.title}>
                {req.title}
                {req.command ? ` — \`${req.command}\`` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {recommendation.generatedContextPackId ? (
        <section className="recommendation-detail__section">
          <h2 className="recommendation-detail__section-title">Generated context pack</h2>
          <Link href={`/context/${recommendation.generatedContextPackId}`}>Open context pack</Link>
        </section>
      ) : null}

      {recommendation.convertedWorkstreamId ? (
        <section className="recommendation-detail__section">
          <h2 className="recommendation-detail__section-title">Converted workstream</h2>
          <Link href={`/workstreams/${recommendation.convertedWorkstreamId}`}>
            Open workstream
          </Link>
        </section>
      ) : null}
    </div>
  );
}
