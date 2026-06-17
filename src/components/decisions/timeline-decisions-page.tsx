"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { formatEventTime } from "@/lib/events/format";
import { EmptyState } from "@/components/platform";

export function TimelineDecisionsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId ?? null);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;

  const decisions = useQuery(
    api.decisions.listDecisions,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId, limit: 50 } : "skip",
  );
  const candidates = useQuery(
    api.decisions.listDecisionCandidates,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId, status: "pending", limit: 30 } : "skip",
  );
  const rollbacks = useQuery(
    api.decisions.listRollbacks,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId, limit: 30 } : "skip",
  );

  const confirmCandidate = useMutation(api.decisions.confirmDecisionCandidate);
  const dismissCandidate = useMutation(api.decisions.dismissDecisionCandidate);
  const createManual = useMutation(api.decisions.createManualDecision);

  const [title, setTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState(false);

  if (!activeWorkspaceId) {
    return <p>Select a workspace to view decisions.</p>;
  }

  return (
    <div className="decisions-page">
      <header className="decisions-page__header">
        <h1>Decisions</h1>
        <p>Confirmed decisions, pending candidates from Slack, and rollbacks.</p>
        <Link href="/timeline">← Back to timeline</Link>
      </header>

      {canWrite ? (
        <section className="decisions-section">
          <h2>Record decision</h2>
          <input
            placeholder="Decision title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Rationale (optional)"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={3}
          />
          <button
            type="button"
            disabled={busy || !title.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await createManual({
                  workspaceId: activeWorkspaceId,
                  title: title.trim(),
                  rationale: rationale.trim() || undefined,
                  decisionType: "engineering",
                });
                setTitle("");
                setRationale("");
              } finally {
                setBusy(false);
              }
            }}
          >
            Record decision
          </button>
        </section>
      ) : null}

      <section className="decisions-section">
        <h2>Pending candidates</h2>
        {!candidates?.length ? <p>No pending candidates.</p> : null}
        <ul className="decisions-list">
          {(candidates ?? []).map((c) => (
            <li key={c.id} className="decision-card">
              <strong>{c.title}</strong>
              <p>{c.rawTextPreview ?? c.summary}</p>
              <span className="decision-card__meta">
                {c.confidence} · {c.source}
              </span>
              {canWrite ? (
                <div className="decision-card__actions">
                  <button
                    type="button"
                    onClick={() =>
                      confirmCandidate({
                        workspaceId: activeWorkspaceId,
                        candidateId: c.id as Id<"decisionCandidates">,
                      })
                    }
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      dismissCandidate({
                        workspaceId: activeWorkspaceId,
                        candidateId: c.id as Id<"decisionCandidates">,
                      })
                    }
                  >
                    Dismiss
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="decisions-section">
        <h2>Confirmed decisions</h2>
        {!decisions?.length ? (
          <EmptyState
            title="No decisions recorded"
            body="Confirm a Slack candidate or record a decision manually to build your decision memory."
          />
        ) : null}
        <ul className="decisions-list">
          {(decisions ?? []).map((d) => (
            <li key={d.id} className="decision-card">
              <Link href={`/decisions/${d.id}`}>
                <strong>{d.title}</strong>
              </Link>
              <p>{d.summary}</p>
              <span className="decision-card__meta">
                {d.status} · {d.source} · {formatEventTime(d.decidedAt)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="decisions-section">
        <h2>Rollbacks</h2>
        <ul className="decisions-list">
          {(rollbacks ?? []).map((r) => (
            <li key={r.id} className="decision-card">
              <strong>{r.title}</strong>
              <p>{r.summary ?? r.reason}</p>
              <span className="decision-card__meta">
                {r.source} · {formatEventTime(r.rolledBackAt)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
