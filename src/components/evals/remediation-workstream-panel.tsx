"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import type { RecommendationRecord } from "@/types/recommendations";

type RemediationWorkstreamPanelProps = {
  workstreamId: string;
};

export function RemediationWorkstreamPanel({ workstreamId }: RemediationWorkstreamPanelProps) {
  const { activeWorkspaceId } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;

  const remediation = useQuery(api.recommendations.getRemediationByWorkstream, {
    workstreamId: workstreamId as Id<"workstreams">,
  }) as RecommendationRecord | null | undefined;

  const rerunForRemediation = useMutation(api.evals.rerunForRemediation);

  const runAction = useCallback(async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }, []);

  if (remediation === undefined || !remediation) return null;

  return (
    <section className="workstream-detail__section">
      <h2 className="workstream-detail__section-title">Remediation Workstream</h2>
      <p className="workstreams-page__subtitle">
        This workstream may be fixing a failed private eval case.
      </p>
      {remediation.evalRunId ? (
        <p>
          Source eval run:{" "}
          <Link href={`/intelligence/evals/runs/${remediation.evalRunId}`}>Open failed eval run</Link>
        </p>
      ) : null}
      <p>
        Recommendation: <Link href={`/recommendations/${remediation.id}`}>{remediation.title}</Link>
      </p>
      {remediation.remediationContextPackId || remediation.generatedContextPackId ? (
        <p>
          Context pack:{" "}
          <Link
            href={`/context/${remediation.remediationContextPackId ?? remediation.generatedContextPackId}`}
          >
            Open context pack
          </Link>
        </p>
      ) : null}
      {remediation.recommendedPlaybookId ? (
        <p>
          Playbook: <Link href={`/playbooks/${remediation.recommendedPlaybookId}`}>Open playbook</Link>
        </p>
      ) : null}
      {remediation.validationRequirements && remediation.validationRequirements.length > 0 ? (
        <ul>
          {remediation.validationRequirements.map((req) => (
            <li key={req.title}>{req.title}</li>
          ))}
        </ul>
      ) : null}
      {remediation.remediationEvalRunId ? (
        <p>
          Latest eval re-run:{" "}
          <Link href={`/intelligence/evals/runs/${remediation.remediationEvalRunId}`}>
            {remediation.remediationStatus ?? "view run"}
          </Link>
        </p>
      ) : null}
      {canWrite && remediation.evalSuiteId ? (
        <button
          type="button"
          className="workstreams-btn"
          disabled={busy}
          onClick={() =>
            void runAction(async () => {
              const result = await rerunForRemediation({
                recommendationId: remediation.id as Id<"recommendations">,
                evalSuiteId: remediation.evalSuiteId as Id<"evalSuites">,
              });
              if (result.runId) {
                window.location.href = `/intelligence/evals/runs/${result.runId}`;
              }
            })
          }
        >
          Run remediation eval
        </button>
      ) : null}
    </section>
  );
}
