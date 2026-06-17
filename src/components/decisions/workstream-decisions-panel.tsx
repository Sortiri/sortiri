"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatEventTime } from "@/lib/events/format";

type WorkstreamDecisionsPanelProps = {
  workspaceId: string;
  workstreamId: string;
};

export function WorkstreamDecisionsPanel({
  workspaceId,
  workstreamId,
}: WorkstreamDecisionsPanelProps) {
  const decisions = useQuery(api.decisions.listDecisions, {
    workspaceId,
    workstreamId: workstreamId as Id<"workstreams">,
    limit: 20,
  });
  const rollbacks = useQuery(api.decisions.listRollbacks, {
    workspaceId,
    limit: 10,
  });

  const linkedRollbacks = (rollbacks ?? []).filter((r) => r.workstreamId === workstreamId);

  return (
    <section className="workstream-decisions-panel">
      <header>
        <h2>Decisions</h2>
        <Link href="/timeline/decisions">View all</Link>
      </header>
      {!decisions?.length ? <p>No linked decisions yet.</p> : null}
      <ul>
        {(decisions ?? []).map((d) => (
          <li key={d.id}>
            <Link href={`/decisions/${d.id}`}>{d.title}</Link>
            <span> · {formatEventTime(d.decidedAt)}</span>
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
