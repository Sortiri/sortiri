"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const OPEN_STATUSES = new Set(["open", "investigating", "mitigated"]);

type ProjectIncidentsPanelProps = {
  workspaceId: string;
  projectId: string;
};

export function ProjectIncidentsPanel({ workspaceId, projectId }: ProjectIncidentsPanelProps) {
  const incidents = useQuery(api.incidents.listIncidents, {
    workspaceId,
    projectId: projectId as Id<"projects">,
    limit: 10,
  });
  const signals = useQuery(api.incidents.listObservabilitySignals, {
    workspaceId,
    projectId: projectId as Id<"projects">,
    limit: 5,
  });
  const rollbacks = useQuery(api.decisions.listRollbacks, {
    workspaceId,
    projectId: projectId as Id<"projects">,
    limit: 5,
  });

  const openCount = (incidents ?? []).filter((i) => OPEN_STATUSES.has(i.status)).length;

  return (
    <section className="project-incidents-panel">
      <h2>Recent incidents</h2>
      {openCount ? <p>{openCount} open</p> : null}
      <ul>
        {(incidents ?? []).map((incident) => (
          <li key={incident.id}>
            <Link href={`/incidents/${incident.id}`}>{incident.title}</Link>
          </li>
        ))}
      </ul>
      <h3>Recent signals</h3>
      <ul>
        {(signals ?? []).map((signal) => (
          <li key={signal.id}>{signal.title}</li>
        ))}
      </ul>
      <h3>Rollbacks this period</h3>
      <ul>
        {(rollbacks ?? []).map((r) => (
          <li key={r.id}>{r.title}</li>
        ))}
      </ul>
      <Link href="/timeline/incidents">Open incidents hub</Link>
    </section>
  );
}
