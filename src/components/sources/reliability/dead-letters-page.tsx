"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  PlatformHubHeader,
  PlatformPage,
} from "@/components/platform";
import { PageLoader } from "@/components/ui/page-loader";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { SourcesSubnav } from "@/components/sources/sources-subnav";
import "./reliability.css";

type DeadLetterRow = {
  id: Id<"ingestDeadLetters">;
  source: string;
  sourceEventId: string;
  reason: string;
  error?: string;
  status: string;
  attempts: number;
  deliveryId?: Id<"ingestDeliveries">;
  journalRef?: string;
  createdAt: number;
};

function formatTime(ts: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

export function DeadLettersPage() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canReplay = capabilities?.canManageSources ?? false;

  const deadLetters = useQuery(
    api.reliabilityIngest.listDeadLetters,
    activeWorkspaceId
      ? { workspaceId: activeWorkspaceId, status: "open", limit: 100 }
      : "skip",
  );

  const [replayingId, setReplayingId] = useState<string | null>(null);
  const replayDelivery = useMutation(api.reliabilityIngest.replayDelivery);

  const rows = (deadLetters ?? []) as DeadLetterRow[];
  const loading = wsLoading || (activeWorkspaceId !== null && deadLetters === undefined);

  async function handleReplay(row: DeadLetterRow) {
    if (!activeWorkspaceId || !canReplay || !row.deliveryId) return;
    setReplayingId(row.id);
    try {
      await replayDelivery({
        workspaceId: activeWorkspaceId,
        deliveryId: row.deliveryId,
      });
    } catch (err) {
      console.error(err instanceof Error ? err.message : "Replay failed");
    } finally {
      setReplayingId(null);
    }
  }

  return (
    <PlatformPage className="reliability-page">
      <PlatformHubHeader
        title="Dead letters"
        subtitle="Failed ingest deliveries that exhausted retries or were rejected."
        backHref="/sources/reliability"
        backLabel="Back to reliability"
        subnav={<SourcesSubnav />}
      />

      {loading ? <PageLoader variant="inline" /> : null}
      {!loading && rows.length === 0 ? (
        <p className="reliability-page__subtitle">No open dead letters.</p>
      ) : null}

      <div className="reliability-list">
        {rows.map((row) => (
          <article key={row.id} className="reliability-row">
            <p className="reliability-row__title">
              {row.source} · {row.sourceEventId}
            </p>
            <p className="reliability-row__meta">
              <span className="reliability-status reliability-status--error">{row.reason}</span>
              {" · "}
              {formatTime(row.createdAt)} · {row.attempts} attempts
            </p>
            {row.error ? <p className="reliability-row__error">{row.error}</p> : null}
            {canReplay ? (
              <button
                type="button"
                className="reliability-btn"
                disabled={replayingId === row.id}
                onClick={() => void handleReplay(row)}
              >
                {replayingId === row.id ? "Replaying…" : "Replay delivery"}
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </PlatformPage>
  );
}
