"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ProjectLink } from "@/components/projects/project-link";

type SourceProjectsLabelProps = {
  workspaceId: string;
  source: string;
  highlightProjectId?: string;
};

export function SourceProjectsLabel({
  workspaceId,
  source,
  highlightProjectId,
}: SourceProjectsLabelProps) {
  const projects = useQuery(api.projects.getProjectsForSource, {
    workspaceId,
    source,
    limit: 5,
  });

  if (!projects || projects.length === 0) return null;

  const label = source.charAt(0).toUpperCase() + source.slice(1);

  return (
    <p className="source-card__projects">
      <strong>{label}</strong>
      {" · Projects: "}
      {projects.map((project, index) => (
        <span key={project.id}>
          {index > 0 ? ", " : ""}
          <ProjectLink
            projectId={project.id}
            label={project.name}
            className={
              project.id === highlightProjectId
                ? "project-link project-link--highlight"
                : "project-link"
            }
          />
        </span>
      ))}
    </p>
  );
}
