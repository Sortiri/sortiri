"use client";

import Link from "next/link";
import { ProjectLink } from "@/components/projects/project-link";
import { WorkstreamStatusBadge } from "@/components/workstreams/workstream-status-badge";
import {
  formatWorkstreamTime,
  getCreatedByLabel,
} from "@/lib/workstreams/format";
import { getStatusLabel } from "@/lib/workstreams/labels";
import type { Workstream } from "@/types/events";

type WorkstreamCardProps = {
  workstream: Workstream;
};

export function WorkstreamCard({ workstream }: WorkstreamCardProps) {
  const createdBy = getCreatedByLabel(workstream.createdBy);
  const started = formatWorkstreamTime(workstream.startedAt);
  const ended = workstream.endedAt ? formatWorkstreamTime(workstream.endedAt) : null;

  const metaParts = [
    getStatusLabel(workstream.status),
    createdBy,
    ended ? `ended ${ended}` : `started ${started}`,
  ];

  return (
    <Link href={`/workstreams/${workstream.id}`} className="workstream-card">
      <div className="workstream-card__top">
        <h3 className="workstream-card__title">{workstream.title}</h3>
        <WorkstreamStatusBadge status={workstream.status} />
      </div>
      {workstream.summary ? (
        <p className="workstream-card__summary">{workstream.summary}</p>
      ) : null}
      {workstream.projectId ? (
        <p className="workstream-card__project">
          <ProjectLink projectId={workstream.projectId} />
        </p>
      ) : null}
      <p className="workstream-card__meta">{metaParts.join(" · ")}</p>
    </Link>
  );
}
