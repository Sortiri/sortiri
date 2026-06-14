"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  formatProjectMeta,
  getProjectHref,
} from "@/lib/projects/format";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import type { ProjectRecord } from "@/types/projects";
import "./projects.css";

type ProjectCardProps = {
  project: ProjectRecord;
  workspaceId: string;
};

export function ProjectCard({ project, workspaceId }: ProjectCardProps) {
  const activeWorkstreams = useQuery(api.workstreams.listByProject, {
    workspaceId,
    projectId: project.id as Id<"projects">,
    status: "active",
    limit: 100,
  });

  const activeCount = activeWorkstreams?.length ?? 0;

  return (
    <Link href={getProjectHref(project.id)} className="project-card">
      <div className="project-card__top">
        <h2 className="project-card__name">{project.name}</h2>
        <ProjectStatusBadge status={project.status} />
      </div>
      <p className="project-card__meta">{formatProjectMeta(project, activeCount)}</p>
      {project.repositoryUrl ? (
        <p className="project-card__repo">{project.repositoryUrl}</p>
      ) : null}
    </Link>
  );
}
