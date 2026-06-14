"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { ProjectCard } from "@/components/projects/project-card";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import type { ProjectRecord } from "@/types/projects";
import "./projects.css";

export function ProjectsPage() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canRepair = capabilities?.canManageMembers ?? false;
  const [repairError, setRepairError] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);

  const projects = useQuery(
    api.projects.listByWorkspace,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId, status: "active" } : "skip",
  );

  const backfillMutation = useMutation(api.projects.backfillProjectScope);

  const handleRepair = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setRepairError(null);
    setRepairing(true);
    try {
      await backfillMutation({ workspaceId: activeWorkspaceId });
    } catch (err) {
      setRepairError(err instanceof Error ? err.message : "Could not repair project scope");
    } finally {
      setRepairing(false);
    }
  }, [activeWorkspaceId, backfillMutation]);

  const loading = wsLoading || (activeWorkspaceId !== null && projects === undefined);
  const projectList = (projects ?? []) as ProjectRecord[];
  const isEmpty = !loading && projectList.length === 0;

  return (
    <div className="projects-page">
      <header className="projects-page__header">
        <div className="projects-page__header-row">
          <div>
            <h1 className="projects-page__title">Projects</h1>
            <p className="projects-page__subtitle">
              Apps, repos, and products with their own timelines.
            </p>
          </div>
          {activeWorkspaceId && canRepair ? (
            <button
              type="button"
              className="projects-page__repair-action"
              onClick={() => void handleRepair()}
              disabled={repairing}
            >
              {repairing ? "Repairing…" : "Repair project scope"}
            </button>
          ) : null}
        </div>
      </header>

      {repairError ? <p className="projects-page__error">{repairError}</p> : null}

      {loading ? (
        <p className="projects-page__loading">Loading projects…</p>
      ) : isEmpty ? (
        <div className="projects-page__empty">
          <p className="projects-page__empty-title">No projects yet</p>
          <p>
            Run <code>sortiri init</code> in a repo to register your first project.
          </p>
          <Link href="/sources">Open Sources for setup</Link>
        </div>
      ) : (
        <div className="projects-list">
          {projectList.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              workspaceId={activeWorkspaceId!}
            />
          ))}
        </div>
      )}
    </div>
  );
}
