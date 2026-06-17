"use client";

import { ProjectLink } from "@/components/projects/project-link";
import { PlatformObjectCard } from "@/components/platform/PlatformObjectCard";
import { StatusBadge } from "@/components/platform/StatusBadge";
import { formatWorkstreamTime } from "@/lib/workstreams/format";

export type WorkstreamObjectCardData = {
  id: string;
  title: string;
  summary?: string;
  status: "active" | "completed" | "archived";
  projectId?: string;
  sourceLabel?: string;
  startedAt: number;
  lastActivityAt?: number;
  eventCount?: number;
  artifactCount?: number;
  decisionCount?: number;
  incidentCount?: number;
};

type WorkstreamObjectCardProps = {
  workstream: WorkstreamObjectCardData;
};

export function WorkstreamObjectCard({ workstream }: WorkstreamObjectCardProps) {
  const statusTone =
    workstream.status === "active"
      ? "success"
      : workstream.status === "completed"
        ? "info"
        : "neutral";

  const started = formatWorkstreamTime(workstream.startedAt);
  const metaParts = [
    workstream.sourceLabel,
    `started ${started}`,
  ].filter(Boolean);

  const statParts: string[] = [];
  if (workstream.eventCount !== undefined) {
    statParts.push(`${workstream.eventCount} event${workstream.eventCount === 1 ? "" : "s"}`);
  }
  if (workstream.artifactCount !== undefined) {
    statParts.push(
      `${workstream.artifactCount} artifact${workstream.artifactCount === 1 ? "" : "s"}`,
    );
  }
  if (workstream.decisionCount !== undefined) {
    statParts.push(
      `${workstream.decisionCount} decision${workstream.decisionCount === 1 ? "" : "s"}`,
    );
  }
  if (workstream.incidentCount !== undefined) {
    statParts.push(
      `${workstream.incidentCount} incident${workstream.incidentCount === 1 ? "" : "s"}`,
    );
  }

  return (
    <PlatformObjectCard
      href={`/workstreams/${workstream.id}`}
      title={workstream.title}
      badge={<StatusBadge label={workstream.status} tone={statusTone} />}
      description={workstream.summary}
      meta={
        <>
          {workstream.projectId ? (
            <span>
              Project: <ProjectLink projectId={workstream.projectId} />
            </span>
          ) : null}
          {metaParts.length > 0 ? <span>{metaParts.join(" · ")}</span> : null}
        </>
      }
      stats={<span>{statParts.join(" · ")}</span>}
      actions={[
        { label: "Open replay", href: `/workstreams/${workstream.id}` },
        { label: "Ask about workstream", href: `/ask?workstreamId=${workstream.id}` },
        { label: "View context", href: `/workstreams/${workstream.id}?tab=context` },
      ]}
    />
  );
}
