"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PageLoader } from "@/components/ui/page-loader";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import type {
  EvalCaseRecord,
  EvalRunRecord,
  EvalSuiteRecord,
} from "@/types/evals";
import "./evals.css";

type EvalSuiteDetailPageProps = {
  evalSuiteId: string;
};

function formatEvalSuiteForCursor(
  suite: EvalSuiteRecord,
  cases: EvalCaseRecord[],
): string {
  const lines: string[] = [
    `# Eval Suite: ${suite.title}`,
    "",
    suite.summary,
    "",
    `Source: ${suite.source}`,
    `Status: ${suite.status}`,
    `Priority: ${suite.priority}`,
    "",
    "## Cases",
  ];

  for (const evalCase of cases) {
    lines.push(
      `${evalCase.order ?? 0}. ${evalCase.title}${evalCase.required ? " (required)" : ""}`,
    );
    lines.push(`   Type: ${evalCase.type}`);
    if (evalCase.description) {
      lines.push(`   ${evalCase.description}`);
    }
    if (evalCase.config && Object.keys(evalCase.config).length > 0) {
      lines.push(`   Config: ${JSON.stringify(evalCase.config)}`);
    }
  }

  lines.push(
    "",
    "---",
    "Note: Run this suite with `sortiri run -- npx tsx scripts/run-eval-suite.ts --suite <id>`.",
    `Eval suite: ${suite.title} (${suite.id})`,
  );

  return lines.join("\n");
}

function runStatusClass(status: EvalRunRecord["status"]): string {
  if (status === "passed") return "eval-badge eval-badge--passed";
  if (status === "failed" || status === "error") return "eval-badge eval-badge--failed";
  if (status === "running" || status === "queued") return "eval-badge eval-badge--running";
  return "eval-badge";
}

export function EvalSuiteDetailPage({ evalSuiteId }: EvalSuiteDetailPageProps) {
  const router = useRouter();
  const { activeWorkspaceId } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const data = useQuery(api.evals.getSuite, {
    evalSuiteId: evalSuiteId as Id<"evalSuites">,
  });

  const runSuite = useMutation(api.evals.runSuite);
  const archiveSuite = useMutation(api.evals.archiveSuite);
  const activateSuite = useMutation(api.evals.activateSuite);
  const generateFromPlaybook = useMutation(api.evals.generateFromPlaybook);
  const generateFromLesson = useMutation(api.evals.generateFromLesson);
  const generateFromRecommendation = useMutation(api.evals.generateFromRecommendation);
  const generateFromContextPack = useMutation(api.evals.generateFromContextPack);

  const suite = data?.suite as EvalSuiteRecord | undefined;
  const cases = (data?.cases ?? []) as EvalCaseRecord[];
  const recentRuns = (data?.recentRuns ?? []) as EvalRunRecord[];

  const runAction = useCallback(
    async (action: () => Promise<unknown>, onSuccess?: (result: unknown) => void) => {
      setBusy(true);
      setError(null);
      try {
        const result = await action();
        onSuccess?.(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const handleCopy = useCallback(async () => {
    if (!suite) return;
    await navigator.clipboard.writeText(formatEvalSuiteForCursor(suite, cases));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [cases, suite]);

  if (data === undefined) {
    return <PageLoader />;
  }

  if (!suite) {
    return (
      <div className="evals-page">
        <p>Eval suite not found.</p>
        <Link href="/intelligence/evals">← Back to Private Evals</Link>
      </div>
    );
  }

  return (
    <div className="evals-page">
      <Link href="/intelligence/evals">← Back to Private Evals</Link>
      <header className="evals-page__header">
        <h1 className="evals-page__title">{suite.title}</h1>
        <p className="evals-page__subtitle">{suite.summary}</p>
        <div className="eval-suite-card__meta">
          <span className="eval-badge">{suite.priority}</span>
          <span className="eval-badge">{suite.source}</span>
          <span className="eval-badge">{suite.status}</span>
        </div>
        <div className="evals-page__actions">
          <button type="button" className="evals-btn" onClick={() => void handleCopy()}>
            {copied ? "Copied!" : "Copy for Cursor"}
          </button>
          {canWrite ? (
            <>
              <button
                type="button"
                className="evals-btn evals-btn--primary"
                disabled={busy || suite.status === "archived"}
                onClick={() =>
                  void runAction(
                    () => runSuite({ evalSuiteId: evalSuiteId as Id<"evalSuites"> }),
                    (result) => {
                      const runId = (result as { runId: string }).runId;
                      router.push(`/intelligence/evals/runs/${runId}`);
                    },
                  )
                }
              >
                Run Suite
              </button>
              {suite.status === "archived" ? (
                <button
                  type="button"
                  className="evals-btn"
                  disabled={busy}
                  onClick={() =>
                    void runAction(() =>
                      activateSuite({ evalSuiteId: evalSuiteId as Id<"evalSuites"> }),
                    )
                  }
                >
                  Activate
                </button>
              ) : (
                <button
                  type="button"
                  className="evals-btn"
                  disabled={busy}
                  onClick={() =>
                    void runAction(() =>
                      archiveSuite({ evalSuiteId: evalSuiteId as Id<"evalSuites"> }),
                    )
                  }
                >
                  Archive
                </button>
              )}
              {suite.playbookId ? (
                <button
                  type="button"
                  className="evals-btn"
                  disabled={busy}
                  onClick={() =>
                    void runAction(() =>
                      generateFromPlaybook({
                        playbookId: suite.playbookId as Id<"playbooks">,
                      }),
                    )
                  }
                >
                  Generate from Playbook
                </button>
              ) : null}
              {suite.lessonId ? (
                <button
                  type="button"
                  className="evals-btn"
                  disabled={busy}
                  onClick={() =>
                    void runAction(() =>
                      generateFromLesson({ lessonId: suite.lessonId as Id<"lessons"> }),
                    )
                  }
                >
                  Generate from Lesson
                </button>
              ) : null}
              {suite.recommendationId ? (
                <button
                  type="button"
                  className="evals-btn"
                  disabled={busy}
                  onClick={() =>
                    void runAction(() =>
                      generateFromRecommendation({
                        recommendationId: suite.recommendationId as Id<"recommendations">,
                      }),
                    )
                  }
                >
                  Generate from Recommendation
                </button>
              ) : null}
              {suite.contextPackId ? (
                <button
                  type="button"
                  className="evals-btn"
                  disabled={busy}
                  onClick={() =>
                    void runAction(() =>
                      generateFromContextPack({
                        contextPackId: suite.contextPackId as Id<"contextPacks">,
                      }),
                    )
                  }
                >
                  Generate from Context Pack
                </button>
              ) : null}
            </>
          ) : null}
        </div>
        {error ? <p className="evals-page__subtitle">{error}</p> : null}
      </header>

      <section className="eval-detail__section">
        <h2 className="eval-detail__section-title">Cases ({cases.length})</h2>
        {cases.length === 0 ? (
          <p className="evals-page__subtitle">No cases in this suite.</p>
        ) : (
          cases.map((evalCase) => (
            <div key={evalCase.id} className="eval-detail__case">
              <p className="eval-detail__case-title">
                {evalCase.title}
                {evalCase.required ? " (required)" : ""}
              </p>
              <p className="evals-page__subtitle">{evalCase.type}</p>
              {evalCase.description ? (
                <p className="evals-page__subtitle">{evalCase.description}</p>
              ) : null}
            </div>
          ))
        )}
      </section>

      <section className="eval-detail__section">
        <h2 className="eval-detail__section-title">Recent runs</h2>
        {recentRuns.length === 0 ? (
          <p className="evals-page__subtitle">No runs yet.</p>
        ) : (
          recentRuns.map((run) => (
            <div key={run.id} className="eval-detail__run-row">
              <div>
                <span className={runStatusClass(run.status)}>{run.status}</span>
                {run.summary ? (
                  <span className="evals-page__subtitle"> — {run.summary}</span>
                ) : null}
              </div>
              <Link href={`/intelligence/evals/runs/${run.id}`} className="evals-btn">
                View
              </Link>
            </div>
          ))
        )}
      </section>

      {suite.playbookId ? (
        <section className="eval-detail__section">
          <h2 className="eval-detail__section-title">Source playbook</h2>
          <Link href={`/playbooks/${suite.playbookId}`}>Open playbook</Link>
        </section>
      ) : null}

      {suite.lessonId ? (
        <section className="eval-detail__section">
          <h2 className="eval-detail__section-title">Source lesson</h2>
          <Link href={`/lessons/${suite.lessonId}`}>Open lesson</Link>
        </section>
      ) : null}

      {suite.recommendationId ? (
        <section className="eval-detail__section">
          <h2 className="eval-detail__section-title">Source recommendation</h2>
          <Link href={`/recommendations/${suite.recommendationId}`}>Open recommendation</Link>
        </section>
      ) : null}

      {suite.contextPackId ? (
        <section className="eval-detail__section">
          <h2 className="eval-detail__section-title">Source context pack</h2>
          <Link href={`/context/${suite.contextPackId}`}>Open context pack</Link>
        </section>
      ) : null}
    </div>
  );
}
