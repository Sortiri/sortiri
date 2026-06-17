"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type {
  EvalResultRecord,
  EvalResultStatus,
  EvalRunRecord,
  EvalSuiteRecord,
} from "@/types/evals";
import { PageLoader } from "@/components/ui/page-loader";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { EvalRemediationPanel } from "@/components/evals/eval-remediation-panel";
import "./evals.css";

type EvalRunDetailPageProps = {
  evalRunId: string;
};

const RESULT_SECTIONS: Array<{ status: EvalResultStatus; title: string }> = [
  { status: "passed", title: "Passed" },
  { status: "failed", title: "Failed" },
  { status: "needs_review", title: "Needs review" },
  { status: "error", title: "Errors" },
  { status: "skipped", title: "Skipped" },
];

function runStatusClass(status: EvalRunRecord["status"]): string {
  if (status === "passed") return "eval-badge eval-badge--passed";
  if (status === "failed" || status === "error") return "eval-badge eval-badge--failed";
  if (status === "running" || status === "queued") return "eval-badge eval-badge--running";
  return "eval-badge";
}

function resultStatusClass(status: EvalResultStatus): string {
  if (status === "passed") return "eval-badge eval-badge--passed";
  if (status === "failed" || status === "error") return "eval-badge eval-badge--failed";
  return "eval-badge";
}

export function EvalRunDetailPage({ evalRunId }: EvalRunDetailPageProps) {
  const { activeWorkspaceId } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;

  const data = useQuery(api.evals.getRun, {
    evalRunId: evalRunId as Id<"evalRuns">,
  });

  const run = data?.run as EvalRunRecord | undefined;
  const suite = data?.suite as EvalSuiteRecord | null | undefined;
  const results = (data?.results ?? []) as EvalResultRecord[];

  const grouped = useMemo(() => {
    return RESULT_SECTIONS.map((section) => ({
      ...section,
      items: results.filter((result) => result.status === section.status),
    })).filter((section) => section.items.length > 0);
  }, [results]);

  if (data === undefined) {
    return <PageLoader />;
  }

  if (!run) {
    return (
      <div className="evals-page">
        <p>Eval run not found.</p>
        <Link href="/intelligence/evals">← Back to Private Evals</Link>
      </div>
    );
  }

  return (
    <div className="evals-page">
      {suite ? (
        <Link href={`/intelligence/evals/${suite.id}`}>← Back to {suite.title}</Link>
      ) : (
        <Link href="/intelligence/evals">← Back to Private Evals</Link>
      )}
      <header className="evals-page__header">
        <h1 className="evals-page__title">Eval Run</h1>
        {suite ? (
          <p className="evals-page__subtitle">
            Suite:{" "}
            <Link href={`/intelligence/evals/${suite.id}`}>{suite.title}</Link>
          </p>
        ) : null}
        {run.summary ? <p className="evals-page__subtitle">{run.summary}</p> : null}
        <div className="eval-suite-card__meta">
          <span className={runStatusClass(run.status)}>{run.status}</span>
          {run.startedAt ? (
            <span className="eval-badge">
              Started {new Date(run.startedAt).toLocaleString()}
            </span>
          ) : null}
          {run.completedAt ? (
            <span className="eval-badge">
              Completed {new Date(run.completedAt).toLocaleString()}
            </span>
          ) : null}
        </div>
      </header>

      {results.length === 0 ? (
        <p className="evals-page__subtitle">No results recorded for this run yet.</p>
      ) : (
        grouped.map((section) => (
          <section key={section.status} className="eval-detail__section">
            <h2 className="eval-detail__section-title">
              {section.title} ({section.items.length})
            </h2>
            {section.items.map((result) => (
              <div key={result.id} className="eval-result">
                <p className="eval-result__title">
                  <span className={resultStatusClass(result.status)}>{result.status}</span>{" "}
                  {result.title}
                </p>
                {result.summary ? (
                  <p className="evals-page__subtitle">{result.summary}</p>
                ) : null}
                {result.error ? (
                  <pre className="eval-result__output">{result.error}</pre>
                ) : null}
                {result.output ? (
                  <pre className="eval-result__output">{result.output}</pre>
                ) : null}
              </div>
            ))}
          </section>
        ))
      )}

      <EvalRemediationPanel evalRunId={evalRunId} run={run} canWrite={canWrite} />
    </div>
  );
}
