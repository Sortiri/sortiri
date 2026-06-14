"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { WorkstreamCard } from "@/components/workstreams/workstream-card";
import { WorkstreamsEmptyState } from "@/components/workstreams/workstreams-empty-state";
import { WorkstreamsFilters } from "@/components/workstreams/workstreams-filters";
import type { WorkstreamFilterValue } from "@/lib/workstreams/labels";
import { ProjectFilter } from "@/components/projects/project-filter";
import { useProjectFilter } from "@/hooks/use-project-filter";
import { useWorkspace } from "@/components/workspace/workspace-context";
import type { Workstream } from "@/types/events";
import "./workstreams.css";

const isDev = process.env.NODE_ENV === "development";

export function WorkstreamsPage() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const { projectId, projectList, setProjectId } = useProjectFilter(activeWorkspaceId);
  const [status, setStatus] = useState<WorkstreamFilterValue>(null);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const workstreams = useQuery(
    api.workstreams.listByWorkspace,
    activeWorkspaceId
      ? {
          workspaceId: activeWorkspaceId,
          status: status ?? undefined,
          projectId,
          limit: 50,
        }
      : "skip",
  );

  const seedMutation = useMutation(api.devSeed.seedWorkstreams);

  const handleSeed = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setSeedError(null);
    setSeeding(true);
    try {
      await seedMutation({ workspaceId: activeWorkspaceId });
    } catch (err) {
      setSeedError(err instanceof Error ? err.message : "Could not add sample workstreams");
    } finally {
      setSeeding(false);
    }
  }, [activeWorkspaceId, seedMutation]);

  const loading = wsLoading || (activeWorkspaceId !== null && workstreams === undefined);
  const workstreamList = (workstreams ?? []) as Workstream[];
  const isEmpty = !loading && workstreamList.length === 0;

  return (
    <div className="workstreams-page">
      <header className="workstreams-page__header">
        <div className="workstreams-page__header-row">
          <h1 className="workstreams-page__title">Workstreams</h1>
          {isDev && activeWorkspaceId ? (
            <button
              type="button"
              className="workstreams-page__dev-action"
              onClick={() => void handleSeed()}
              disabled={seeding}
            >
              {seeding ? "Adding…" : "Add sample workstreams"}
            </button>
          ) : null}
        </div>
        <p className="workstreams-page__subtitle">
          Replayable agent sessions and tasks — every step in chronological order.
        </p>
      </header>

      {seedError ? <p className="workstreams-page__error">{seedError}</p> : null}

      <WorkstreamsFilters value={status} onChange={setStatus} />
      {projectList.length > 0 ? (
        <ProjectFilter
          projects={projectList}
          value={projectId ?? null}
          onChange={setProjectId}
        />
      ) : null}

      {loading ? (
        <p className="workstreams-page__loading">Loading workstreams…</p>
      ) : isEmpty ? (
        <WorkstreamsEmptyState
          onSeed={() => void handleSeed()}
          seeding={seeding}
          showSeedAction={isDev && Boolean(activeWorkspaceId)}
        />
      ) : (
        <div className="workstreams-list">
          {workstreamList.map((workstream) => (
            <WorkstreamCard key={workstream.id} workstream={workstream} />
          ))}
        </div>
      )}
    </div>
  );
}
