"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatEventTime } from "@/lib/events/format";

const OPEN_STATUSES = new Set(["open", "investigating", "mitigated"]);

type WorkstreamIncidentsPanelProps = {
  workspaceId: string;
  workstreamId: string;
};

export function WorkstreamIncidentsPanel({
  workspaceId,
  workstreamId,
}: WorkstreamIncidentsPanelProps) {
  const incidents = useQuery(api.incidents.listIncidents, {
    workspaceId,
    workstreamId: workstreamId as Id<"workstreams">,
    limit: 20,
  });
  const rollbacks = useQuery(api.decisions.listRollbacks, {
    workspaceId,
    limit: 10,
  });

  const linkedRollbacks = (rollbacks ?? []).filter((r) => r.workstreamId === workstreamId);
  const openIncidents = (incidents ?? []).filter((i) => OPEN_STATUSES.has(i.status));

  return (
    <section className="workstream-incidents-panel">
      <header>
        <h2>Incidents</h2>
        <Link href="/timeline/incidents">View all</Link>
      </header>
      {!incidents?.length ? <p>No linked incidents yet.</p> : null}
      {openIncidents.length ? <p>{openIncidents.length} open</p> : null}
      <ul>
        {(incidents ?? []).map((incident) => (
          <li key={incident.id}>
            <Link href={`/incidents/${incident.id}`}>{incident.title}</Link>
            <span>
              {" "}
              · {incident.status} · {formatEventTime(incident.startedAt)}
            </span>
          </li>
        ))}
      </ul>
      {linkedRollbacks.length ? (
        <>
          <h3>Rollbacks</h3>
          <ul>
            {linkedRollbacks.map((r) => (
              <li key={r.id}>{r.title}</li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
