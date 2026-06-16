"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import type { RecommendationRecord } from "@/types/recommendations";
import type { EvalRunRecord } from "@/types/evals";

type EvalRemediationPanelProps = {
  evalRunId: string;
  run: EvalRunRecord;
  canWrite: boolean;
};

export function EvalRemediationPanel({ evalRunId, run, canWrite }: EvalRemediationPanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remediations = useQuery(api.recommendations.listForEvalRun, {
    evalRunId: evalRunId as Id<"evalRuns">,
  }) as RecommendationRecord[] | undefined;

  const generateFromEvalRun = useMutation(api.recommendations.generateFromEvalRun);
  const generateRemediationContext = useMutation(api.recommendations.generateRemediationContextPack);
  const convertToWorkstream = useMutation(api.recommendations.convertToWorkstream);
  const rerunForRemediation = useMutation(api.evals.rerunForRemediation);

  const needsRemediation = ["failed", "error", "needs_review"].includes(run.status);

  const runAction = useCallback(async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }, []);

  if (!needsRemediation && (!remediations || remediations.length === 0)) {
    return null;
  }

  return (
    <section className="eval-detail__section">
      <h2 className="eval-detail__section-title">Remediation</h2>
      {needsRemediation ? (
        <p className="evals-page__subtitle">Failed cases detected — generate remediation recommendations.</p>
      ) : null}
      {canWrite && needsRemediation ? (
        <div className="evals-page__actions">
          <button
            type="button"
            className="evals-btn evals-btn--primary"
            disabled={busy}
            onClick={() =>
              void runAction(() => generateFromEvalRun({ evalRunId: evalRunId as Id<"evalRuns"> }))
            }
          >
            Generate remediation recommendations
          </button>
        </div>
      ) : null}
      {error ? <p className="evals-page__subtitle">{error}</p> : null}
      {remediations && remediations.length > 0 ? (
        <div className="eval-remediation-list">
          {remediations.map((rec) => (
            <div key={rec.id} className="eval-result">
              <p className="eval-result__title">
                <Link href={`/recommendations/${rec.id}`}>{rec.title}</Link>
              </p>
              <div className="eval-suite-card__meta">
                <span className="eval-badge">{rec.priority}</span>
                {rec.remediationStatus ? (
                  <span className="eval-badge">{rec.remediationStatus}</span>
                ) : null}
              </div>
              {canWrite ? (
                <div className="evals-page__actions">
                  <button
                    type="button"
                    className="evals-btn"
                    disabled={busy}
                    onClick={() =>
                      void runAction(() =>
                        generateRemediationContext({
                          recommendationId: rec.id as Id<"recommendations">,
                        }),
                      )
                    }
                  >
                    Generate context
                  </button>
                  <button
                    type="button"
                    className="evals-btn"
                    disabled={busy}
                    onClick={() =>
                      void runAction(() =>
                        convertToWorkstream({
                          recommendationId: rec.id as Id<"recommendations">,
                        }),
                      )
                    }
                  >
                    Convert to workstream
                  </button>
                  {rec.evalSuiteId ? (
                    <button
                      type="button"
                      className="evals-btn"
                      disabled={busy}
                      onClick={() =>
                        void runAction(async () => {
                          const result = await rerunForRemediation({
                            recommendationId: rec.id as Id<"recommendations">,
                            evalSuiteId: rec.evalSuiteId as Id<"evalSuites">,
                          });
                          if (result.runId) {
                            window.location.href = `/intelligence/evals/runs/${result.runId}`;
                          }
                        })
                      }
                    >
                      Run eval again
                    </button>
                  ) : null}
                </div>
              ) : null}
              {rec.remediationEvalRunId ? (
                <p className="evals-page__subtitle">
                  Latest re-run:{" "}
                  <Link href={`/intelligence/evals/runs/${rec.remediationEvalRunId}`}>
                    {rec.remediationStatus ?? "view run"}
                  </Link>
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <Link href={`/ask?evalRunId=${evalRunId}`} className="evals-btn">
        Ask about this eval run
      </Link>
    </section>
  );
}
