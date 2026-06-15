"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import type { EvalSuiteRecord } from "@/types/evals";
import "../evals/evals.css";

type WorkstreamPrivateEvalsPanelProps = {
  workspaceId: string;
  workstreamId: string;
};

export function WorkstreamPrivateEvalsPanel({
  workspaceId,
  workstreamId,
}: WorkstreamPrivateEvalsPanelProps) {
  const { capabilities } = useWorkspaceMembership(workspaceId);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recommended = useQuery(api.evals.recommendForWorkstream, {
    workstreamId: workstreamId as Id<"workstreams">,
  });
  const runs = useQuery(api.evals.listRunsForWorkstream, {
    workstreamId: workstreamId as Id<"workstreams">,
    limit: 5,
  });
  const runSuite = useMutation(api.evals.runSuite);

  const suites = (recommended ?? []) as EvalSuiteRecord[];

  const handleRun = async (evalSuiteId: string) => {
    setBusy(true);
    setError(null);
    try {
      await runSuite({ evalSuiteId: evalSuiteId as Id<"evalSuites"> });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not queue eval run");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="evals-workstream-panel">
      <h2 className="evals-workstream-panel__title">Private Evals</h2>
      <p className="evals-page__subtitle">
        Company-specific eval suites linked to this workstream or project.
      </p>
      {error ? <p className="evals-page__subtitle">{error}</p> : null}
      {suites.length > 0 ? (
        <ul className="evals-workstream-panel__list">
          {suites.map((suite) => (
            <li key={suite.id}>
              <Link href={`/intelligence/evals/${suite.id}`}>{suite.title}</Link>
              {canWrite ? (
                <button
                  type="button"
                  className="evals-btn"
                  disabled={busy}
                  onClick={() => void handleRun(suite.id)}
                >
                  Run Evals
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="evals-page__subtitle">No linked eval suites yet.</p>
      )}
      {runs && runs.length > 0 ? (
        <div>
          <h3 className="evals-workstream-panel__subtitle">Recent runs</h3>
          <ul className="evals-workstream-panel__list">
            {runs.map((run) => (
              <li key={run.id}>
                <Link href={`/intelligence/evals/runs/${run.id}`}>
                  {run.status} — {new Date(run.createdAt).toLocaleString()}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Link href="/intelligence/evals" className="evals-btn">
        View all eval suites
      </Link>
    </section>
  );
}
