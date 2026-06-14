"use client";

import { useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { ProjectRecord } from "@/types/projects";

export function useProjectFilter(workspaceId: string | null) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const projectIdParam = searchParams.get("projectId");
  const projectId = projectIdParam
    ? (projectIdParam as Id<"projects">)
    : undefined;

  const projects = useQuery(
    api.projects.listByWorkspace,
    workspaceId ? { workspaceId, status: "active" } : "skip",
  );

  const projectList = (projects ?? []) as ProjectRecord[];

  const selectedProject = useMemo(
    () => projectList.find((p) => p.id === projectIdParam) ?? null,
    [projectList, projectIdParam],
  );

  const setProjectId = useCallback(
    (nextId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextId) {
        params.set("projectId", nextId);
      } else {
        params.delete("projectId");
      }
      const query = params.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  return {
    projectId,
    projectIdParam,
    projectList,
    selectedProject,
    setProjectId,
  };
}
