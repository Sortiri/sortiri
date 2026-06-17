"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ObjectHeader, ObjectMetaRow, SignalBadge, StatusBadge } from "@/components/platform";
import { PageLoader } from "@/components/ui/page-loader";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { formatEventTime } from "@/lib/events/format";
import "./incident-detail.css";

type IncidentDetailPageProps = {
  incidentId: string;
};

function incidentStatusTone(
  status: string,
): "success" | "warning" | "error" | "info" | "neutral" {
  switch (status) {
    case "resolved":
      return "success";
    case "investigating":
    case "mitigated":
    case "rolled_back":
      return "warning";
    case "open":
      return "error";
    default:
      return "neutral";
  }
}

function incidentSeverityLevel(
  severity: string,
): "info" | "warning" | "error" | "critical" {
  if (
    severity === "info" ||
    severity === "warning" ||
    severity === "error" ||
    severity === "critical"
  ) {
    return severity;
  }
  return "info";
}

export function IncidentDetailPage({ incidentId }: IncidentDetailPageProps) {
  const { activeWorkspaceId } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId ?? null);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;

  const data = useQuery(
    api.incidents.getIncident,
    activeWorkspaceId
      ? {
          workspaceId: activeWorkspaceId,
          incidentId: incidentId as Id<"incidents">,
        }
      : "skip",
  );
  const signals = useQuery(
    api.incidents.listObservabilitySignals,
    activeWorkspaceId
      ? {
          workspaceId: activeWorkspaceId,
          incidentId: incidentId as Id<"incidents">,
          limit: 50,
        }
      : "skip",
  );

  const markInvestigating = useMutation(api.incidents.markInvestigating);
  const markMitigated = useMutation(api.incidents.markMitigated);
  const markResolved = useMutation(api.incidents.markResolved);
  const archiveIncident = useMutation(api.incidents.archiveIncident);

  const [rootCause, setRootCause] = useState("");
  const [mitigation, setMitigation] = useState("");
  const [busy, setBusy] = useState(false);

  if (!activeWorkspaceId) return <p>Select a workspace.</p>;
  if (data === undefined) return <PageLoader />;
  if (!data) return <p>Incident not found.</p>;

  const { incident, rollbacks } = data;

  async function runStatusAction(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="incident-detail-page">
      <ObjectHeader
        backHref="/timeline/incidents"
        backLabel="Incidents"
        title={incident.title}
        badges={
          <>
            <SignalBadge
              severity={incidentSeverityLevel(incident.severity)}
              label={incident.severity}
            />
            <StatusBadge
              label={incident.status}
              tone={incidentStatusTone(incident.status)}
            />
          </>
        }
        actions={
          <Link href={`/ask?incidentId=${incident.id}`} className="decision-detail-page__ask-link">
            Ask about this incident
          </Link>
        }
        meta={
          <ObjectMetaRow
            items={[
              { label: "Source", value: incident.source },
              { label: "Started", value: formatEventTime(incident.startedAt) },
              ...(incident.service ? [{ label: "Service", value: incident.service }] : []),
              ...(incident.environment
                ? [{ label: "Environment", value: incident.environment }]
                : []),
            ]}
          />
        }
      />

      {incident.summary ? (
        <section className="object-section">
          <h2 className="object-section__title">Summary</h2>
          <p className="object-section__body">{incident.summary}</p>
        </section>
      ) : null}

      {incident.rootCause ? (
        <section className="object-section">
          <h2 className="object-section__title">Root cause</h2>
          <p className="object-section__body">{incident.rootCause}</p>
        </section>
      ) : null}

      {incident.mitigation ? (
        <section className="object-section">
          <h2 className="object-section__title">Mitigation</h2>
          <p className="object-section__body">{incident.mitigation}</p>
        </section>
      ) : null}

      <section className="object-section">
        <h2 className="object-section__title">Signals</h2>
        {!signals?.length ? (
          <p className="object-section__body">No linked signals.</p>
        ) : (
          <ul>
            {(signals ?? []).map((signal) => (
              <li key={signal.id}>
                <strong>{signal.title}</strong>
                <span>
                  {" "}
                  · {signal.signalType} · {formatEventTime(signal.occurredAt)}
                </span>
                {signal.sourceUrl ? (
                  <>
                    {" "}
                    ·{" "}
                    <a href={signal.sourceUrl} target="_blank" rel="noreferrer">
                      Source
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="object-section">
        <h2 className="object-section__title">Links</h2>
        <ul>
          {incident.sourceRef?.sourceUrl ? (
            <li>
              <a href={incident.sourceRef.sourceUrl} target="_blank" rel="noreferrer">
                External source
              </a>
            </li>
          ) : null}
          {incident.workstreamId ? (
            <li>
              <Link href={`/workstreams/${incident.workstreamId}`}>Linked workstream</Link>
            </li>
          ) : null}
          {(incident.linkedWorkstreamIds ?? []).map((id) => (
            <li key={id}>
              <Link href={`/workstreams/${id}`}>Workstream {id}</Link>
            </li>
          ))}
          {(incident.linkedDecisionIds ?? []).map((id) => (
            <li key={id}>
              <Link href={`/decisions/${id}`}>Decision {id}</Link>
            </li>
          ))}
          {(incident.linkedEventIds ?? []).map((id) => (
            <li key={id}>Timeline event {id}</li>
          ))}
        </ul>
        {rollbacks.length ? (
          <>
            <h3 className="object-section__title">Rollbacks</h3>
            <ul>
              {rollbacks.map((r) => (
                <li key={r.id}>{r.title}</li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      {canWrite ? (
        <section className="object-section">
          <h2 className="object-section__title">Status actions</h2>
          <div className="incident-detail-page__actions">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                runStatusAction(() =>
                  markInvestigating({
                    workspaceId: activeWorkspaceId,
                    incidentId: incident.id as Id<"incidents">,
                  }),
                )
              }
            >
              Mark investigating
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                runStatusAction(() =>
                  markMitigated({
                    workspaceId: activeWorkspaceId,
                    incidentId: incident.id as Id<"incidents">,
                  }),
                )
              }
            >
              Mark mitigated
            </button>
            <textarea
              placeholder="Root cause (optional)"
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              rows={2}
            />
            <textarea
              placeholder="Mitigation (optional)"
              value={mitigation}
              onChange={(e) => setMitigation(e.target.value)}
              rows={2}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                runStatusAction(() =>
                  markResolved({
                    workspaceId: activeWorkspaceId,
                    incidentId: incident.id as Id<"incidents">,
                    rootCause: rootCause.trim() || undefined,
                    mitigation: mitigation.trim() || undefined,
                  }),
                )
              }
            >
              Mark resolved
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                runStatusAction(() =>
                  archiveIncident({
                    workspaceId: activeWorkspaceId,
                    incidentId: incident.id as Id<"incidents">,
                  }),
                )
              }
            >
              Archive
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
