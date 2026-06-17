"use client";

import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  PlatformHubHeader,
  PlatformPage,
  PlatformPageActions,
} from "@/components/platform";
import { PageLoader } from "@/components/ui/page-loader";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { SourcesSubnav } from "@/components/sources/sources-subnav";
import "./reliability.css";

type DeliveryStatus =
  | "all"
  | "received"
  | "journaled"
  | "convex_written"
  | "retry_pending"
  | "dead_lettered"
  | "replayed"
  | "duplicate";

type DeliveryRow = {
  id: Id<"ingestDeliveries">;
  source: string;
  sourceEventId: string;
  status: string;
  attempts: number;
  lastError?: string;
  receivedAt: number;
  journalRef?: string;
};

type HealthEntry = {
  deliveriesLast24h: number;
  retryPending: number;
  deadLetters: number;
  duplicates: number;
  lastSuccessfulAt?: number;
  lastFailedAt?: number;
  health: "healthy" | "degraded" | "error";
};

function formatTime(ts?: number): string {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

function statusClass(status: string): string {
  if (status === "retry_pending" || status === "dead_lettered") {
    return "reliability-status reliability-status--error";
  }
  if (status === "journaled" || status === "received") {
    return "reliability-status reliability-status--retry";
  }
  return "reliability-status reliability-status--ok";
}

export function ReliabilityPage() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canReplay = capabilities?.canManageSources ?? false;

  const [statusFilter, setStatusFilter] = useState<DeliveryStatus>("all");
  const [sourceFilter, setSourceFilter] = useState("");

  const health = useQuery(
    api.reliabilityIngest.getDeliveryHealthSummary,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip",
  );

  const deliveries = useQuery(
    api.reliabilityIngest.listDeliveries,
    activeWorkspaceId
      ? {
          workspaceId: activeWorkspaceId,
          status: statusFilter === "all" ? undefined : statusFilter,
          source: sourceFilter || undefined,
          limit: 100,
        }
      : "skip",
  );

  const [replayingId, setReplayingId] = useState<string | null>(null);
  const replayDelivery = useMutation(api.reliabilityIngest.replayDelivery);

  const healthEntries = useMemo(() => {
    if (!health) return [];
    return Object.entries(health as Record<string, HealthEntry>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
  }, [health]);

  const rows = (deliveries ?? []) as DeliveryRow[];
  const loading = wsLoading || (activeWorkspaceId !== null && deliveries === undefined);

  async function handleReplay(delivery: DeliveryRow) {
    if (!activeWorkspaceId || !canReplay) return;
    setReplayingId(delivery.id);
    try {
      await replayDelivery({
        workspaceId: activeWorkspaceId,
        deliveryId: delivery.id,
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
        title="Ingest reliability"
        subtitle="Monitor durable ingest deliveries, retries, and per-source health."
        backHref="/sources"
        backLabel="Back to Sources"
        actions={
          <PlatformPageActions
            secondary={[{ label: "Dead letters", href: "/sources/reliability/dead-letters" }]}
          />
        }
        subnav={<SourcesSubnav />}
      />

      {healthEntries.length > 0 ? (
        <section className="reliability-health-grid">
          {healthEntries.map(([source, entry]) => (
            <article key={source} className="reliability-health-card">
              <p className="reliability-health-card__source">{source}</p>
              <p className="reliability-health-card__meta">
                {entry.health} · {entry.deliveriesLast24h} deliveries (24h) ·{" "}
                {entry.retryPending} retry · {entry.deadLetters} dead letters
              </p>
            </article>
          ))}
        </section>
      ) : null}

      <div className="reliability-filters">
        <label>
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DeliveryStatus)}
          >
            <option value="all">All</option>
            <option value="retry_pending">Retry pending</option>
            <option value="dead_lettered">Dead lettered</option>
            <option value="convex_written">Written</option>
            <option value="replayed">Replayed</option>
            <option value="duplicate">Duplicate</option>
          </select>
        </label>
        <label>
          Source
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="">All sources</option>
            {healthEntries.map(([source]) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? <PageLoader variant="inline" /> : null}
      {!loading && rows.length === 0 ? (
        <p className="reliability-page__subtitle">No deliveries match these filters.</p>
      ) : null}

      <div className="reliability-list">
        {rows.map((delivery) => (
          <article key={delivery.id} className="reliability-row">
            <p className="reliability-row__title">
              {delivery.source} · {delivery.sourceEventId}
            </p>
            <p className="reliability-row__meta">
              <span className={statusClass(delivery.status)}>{delivery.status}</span>
              {" · "}
              {formatTime(delivery.receivedAt)} · {delivery.attempts} attempts
              {delivery.journalRef ? ` · journal: ${delivery.journalRef}` : ""}
            </p>
            {delivery.lastError ? (
              <p className="reliability-row__error">{delivery.lastError}</p>
            ) : null}
            {canReplay &&
            (delivery.status === "retry_pending" || delivery.status === "dead_lettered") ? (
              <button
                type="button"
                className="reliability-btn"
                disabled={replayingId === delivery.id}
                onClick={() => void handleReplay(delivery)}
              >
                {replayingId === delivery.id ? "Replaying…" : "Replay"}
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </PlatformPage>
  );
}
