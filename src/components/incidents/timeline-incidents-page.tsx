"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { formatEventTime } from "@/lib/events/format";
import { EmptyState } from "@/components/platform";

const OPEN_STATUSES = new Set(["open", "investigating", "mitigated"]);
const RESOLVED_STATUSES = new Set(["resolved", "rolled_back", "archived"]);

export function TimelineIncidentsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId ?? null);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;

  const incidents = useQuery(
    api.incidents.listIncidents,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId, limit: 100 } : "skip",
  );
  const signals = useQuery(
    api.incidents.listObservabilitySignals,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId, limit: 30 } : "skip",
  );
  const rollbacks = useQuery(
    api.decisions.listRollbacks,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId, limit: 30 } : "skip",
  );

  const createManual = useMutation(api.incidents.createManualIncident);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  const { openIncidents, resolvedIncidents } = useMemo(() => {
    const open = (incidents ?? []).filter((i) => OPEN_STATUSES.has(i.status));
    const resolved = (incidents ?? []).filter((i) => RESOLVED_STATUSES.has(i.status));
    return { openIncidents: open, resolvedIncidents: resolved };
  }, [incidents]);

  if (!activeWorkspaceId) {
    return <p>Select a workspace to view incidents.</p>;
  }

  return (
    <div className="incidents-page">
      <header className="incidents-page__header">
        <h1>Incidents</h1>
        <p>Open incidents, resolved history, observability signals, and rollbacks.</p>
        <Link href="/timeline">← Back to timeline</Link>
      </header>

      {canWrite ? (
        <section className="incidents-section">
          <h2>Record incident</h2>
          <input
            placeholder="Incident title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Summary (optional)"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
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
                  summary: summary.trim() || undefined,
                  severity: "error",
                });
                setTitle("");
                setSummary("");
              } finally {
                setBusy(false);
              }
            }}
          >
            Record incident
          </button>
        </section>
      ) : null}

      <section className="incidents-section">
        <h2>Open</h2>
        {!openIncidents.length && !resolvedIncidents.length ? (
          <EmptyState
            title="No incidents yet"
            body="Record an incident manually or connect observability to track failures and rollbacks."
            actions={[{ label: "View sources", href: "/sources" }]}
          />
        ) : !openIncidents.length ? (
          <p>No open incidents.</p>
        ) : null}
        <ul className="incidents-list">
          {openIncidents.map((incident) => (
            <li key={incident.id} className="incident-card">
              <Link href={`/incidents/${incident.id}`}>
                <strong>{incident.title}</strong>
              </Link>
              <p>{incident.summary}</p>
              <span className="incident-card__meta">
                {incident.status} · {incident.severity} · {incident.source} ·{" "}
                {formatEventTime(incident.startedAt)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="incidents-section">
        <h2>Resolved</h2>
        {!resolvedIncidents.length ? <p>No resolved incidents.</p> : null}
        <ul className="incidents-list">
          {resolvedIncidents.map((incident) => (
            <li key={incident.id} className="incident-card">
              <Link href={`/incidents/${incident.id}`}>
                <strong>{incident.title}</strong>
              </Link>
              <p>{incident.summary}</p>
              <span className="incident-card__meta">
                {incident.status} · {incident.severity} · {formatEventTime(incident.resolvedAt ?? incident.startedAt)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="incidents-section">
        <h2>Recent signals</h2>
        {!signals?.length ? <p>No observability signals yet.</p> : null}
        <ul className="incidents-list">
          {(signals ?? []).map((signal) => (
            <li key={signal.id} className="incident-card">
              <strong>{signal.title}</strong>
              <p>{signal.summary}</p>
              <span className="incident-card__meta">
                {signal.signalType} · {signal.severity} · {signal.source}
                {signal.service ? ` · ${signal.service}` : ""} · {formatEventTime(signal.occurredAt)}
              </span>
              {signal.incidentId ? (
                <Link href={`/incidents/${signal.incidentId}`}>View incident</Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="incidents-section">
        <h2>Rollbacks</h2>
        <ul className="incidents-list">
          {(rollbacks ?? []).map((rollback) => (
            <li key={rollback.id} className="incident-card">
              <strong>{rollback.title}</strong>
              <p>{rollback.summary ?? rollback.reason}</p>
              <span className="incident-card__meta">
                {rollback.source} · {formatEventTime(rollback.rolledBackAt)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
