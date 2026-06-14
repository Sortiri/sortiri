"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getProjectHref } from "@/lib/projects/format";
import { useWorkspace } from "@/components/workspace/workspace-context";

type ProjectLinkProps = {
  projectId: string;
  label?: string;
  className?: string;
};

export function ProjectLink({ projectId, label, className }: ProjectLinkProps) {
  const { activeWorkspaceId } = useWorkspace();

  const project = useQuery(
    api.projects.getById,
    activeWorkspaceId
      ? {
          workspaceId: activeWorkspaceId,
          projectId: projectId as Id<"projects">,
        }
      : "skip",
  );

  const name = label ?? project?.name ?? "Project";

  return (
    <Link href={getProjectHref(projectId)} className={className ?? "project-link"}>
      {name}
    </Link>
  );
}
