"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type ProjectDecisionsPanelProps = {
  workspaceId: string;
  projectId: string;
};

export function ProjectDecisionsPanel({ workspaceId, projectId }: ProjectDecisionsPanelProps) {
  const decisions = useQuery(api.decisions.listDecisions, {
    workspaceId,
    projectId: projectId as Id<"projects">,
    limit: 10,
  });
  const candidates = useQuery(api.decisions.listDecisionCandidates, {
    workspaceId,
    status: "pending",
    limit: 5,
  });
  const rollbacks = useQuery(api.decisions.listRollbacks, {
    workspaceId,
    projectId: projectId as Id<"projects">,
    limit: 5,
  });

  return (
    <section className="project-decisions-panel">
      <h2>Recent decisions</h2>
      <ul>
        {(decisions ?? []).map((d) => (
          <li key={d.id}>
            <Link href={`/decisions/${d.id}`}>{d.title}</Link>
          </li>
        ))}
      </ul>
      <p>{candidates?.length ?? 0} pending candidates workspace-wide</p>
      <h3>Rollbacks this period</h3>
      <ul>
        {(rollbacks ?? []).map((r) => (
          <li key={r.id}>{r.title}</li>
        ))}
      </ul>
      <Link href="/timeline/decisions">Open decisions hub</Link>
    </section>
  );
}
