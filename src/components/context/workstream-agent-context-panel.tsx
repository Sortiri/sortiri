"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { GenerateContextPackButton } from "@/components/context/generate-context-pack-button";
import type { ContextPackRecord } from "@/types/context-packs";
import "./context.css";

type WorkstreamAgentContextPanelProps = {
  workspaceId: string;
  workstreamId: string;
  workstreamTitle: string;
  projectId?: string;
};

export function WorkstreamAgentContextPanel({
  workspaceId,
  workstreamId,
  workstreamTitle,
  projectId,
}: WorkstreamAgentContextPanelProps) {
  const packs = useQuery(api.contextPacks.listForWorkstream, {
    workstreamId: workstreamId as Id<"workstreams">,
    limit: 3,
  });
  const failures = useQuery(api.contextPacks.getKnownFailures, {
    workspaceId,
    goal: workstreamTitle,
    projectId: projectId as Id<"projects"> | undefined,
  });
  const validations = useQuery(api.contextPacks.getValidationRequirements, {
    workspaceId,
    goal: workstreamTitle,
  });
  const playbook = useQuery(api.contextPacks.getRecommendedPlaybook, {
    workspaceId,
    goal: workstreamTitle,
    projectId: projectId as Id<"projects"> | undefined,
  });

  const latestPack = (packs?.[0] ?? null) as ContextPackRecord | null;

  return (
    <section className="context-agent-panel">
      <h2 className="context-agent-panel__title">Agent Context</h2>
      <p className="context-agent-panel__meta">
        {latestPack
          ? `Latest pack: ${latestPack.title} (${new Date(latestPack.createdAt).toLocaleDateString()})`
          : "No context pack for this workstream yet."}
      </p>
      {playbook ? (
        <p className="context-agent-panel__meta">
          Recommended playbook:{" "}
          <Link href={`/playbooks/${playbook.id}`}>{playbook.title}</Link>
        </p>
      ) : null}
      {failures && failures.length > 0 ? (
        <p className="context-agent-panel__meta">
          Known failures: {failures.slice(0, 3).map((f) => f.title).join("; ")}
        </p>
      ) : null}
      {validations && validations.length > 0 ? (
        <p className="context-agent-panel__meta">
          Validation: {validations.slice(0, 3).map((v) => v.title).join("; ")}
        </p>
      ) : null}
      <div className="context-agent-panel__actions">
        <GenerateContextPackButton
          workspaceId={workspaceId}
          scope={{
            workstreamId,
            projectId,
            goal: workstreamTitle,
            title: `Context: ${workstreamTitle}`,
          }}
        />
        {latestPack ? (
          <Link href={`/context/${latestPack.id}`} className="context-btn">
            View latest pack
          </Link>
        ) : null}
        <Link href="/context" className="context-btn">
          All context packs
        </Link>
      </div>
    </section>
  );
}
