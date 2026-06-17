"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { WorkstreamObjectCard } from "@/components/workstreams/workstream-object-card";
import { WorkstreamsEmptyState } from "@/components/workstreams/workstreams-empty-state";
import { ProjectFilter } from "@/components/projects/project-filter";
import { useProjectFilter } from "@/hooks/use-project-filter";
import {
  PlatformFilterBar,
  PlatformList,
  PlatformOverflowMenu,
  PlatformPage,
  PlatformPageActions,
  PlatformPageHeader,
  PlatformTabs,
} from "@/components/platform";
import { PageLoader } from "@/components/ui/page-loader";
import { useWorkspace } from "@/components/workspace/workspace-context";
import "./workstreams.css";

const isDev = process.env.NODE_ENV === "development";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "archived", label: "Archived" },
] as const;

type StatusTabId = (typeof STATUS_TABS)[number]["id"];

export function WorkstreamsPage() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const { projectId, projectList, setProjectId } = useProjectFilter(activeWorkspaceId);
  const [statusTab, setStatusTab] = useState<StatusTabId>("all");
  const [search, setSearch] = useState("");
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const allWorkstreams = useQuery(
    api.workstreams.listSummariesByWorkspace,
    activeWorkspaceId
      ? {
          workspaceId: activeWorkspaceId,
          projectId,
          limit: 100,
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

  const tabCounts = useMemo(() => {
    const list = allWorkstreams ?? [];
    return {
      all: list.length,
      active: list.filter((w) => w.status === "active").length,
      completed: list.filter((w) => w.status === "completed").length,
      archived: list.filter((w) => w.status === "archived").length,
    };
  }, [allWorkstreams]);

  const filtered = useMemo(() => {
    let list = [...(allWorkstreams ?? [])];
    if (statusTab !== "all") {
      list = list.filter((w) => w.status === statusTab);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          (w.summary?.toLowerCase().includes(q) ?? false),
      );
    }
    return list;
  }, [allWorkstreams, statusTab, search]);

  const loading = wsLoading || (activeWorkspaceId !== null && allWorkstreams === undefined);
  const isEmpty = !loading && filtered.length === 0;
  const noData = !loading && (allWorkstreams?.length ?? 0) === 0;

  const devOverflow = isDev
    ? [
        {
          label: seeding ? "Adding…" : "Add sample workstreams",
          onClick: () => void handleSeed(),
          disabled: seeding,
        },
      ]
    : [];

  return (
    <PlatformPage className="workstreams-page">
      <PlatformPageHeader
        title="Workstreams"
        subtitle="Replayable agent sessions and tasks, with every step in chronological order."
        actions={
          <PlatformPageActions
            primary={{ label: "Record via MCP or CLI", href: "/sources" }}
            overflow={
              devOverflow.length > 0 ? (
                <PlatformOverflowMenu items={devOverflow} label="Developer actions" />
              ) : undefined
            }
          />
        }
      />

      {seedError ? <p className="workstreams-page__error">{seedError}</p> : null}

      {!noData ? (
        <PlatformFilterBar
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search workstreams…",
            label: "Search workstreams",
          }}
          controls={
            projectList.length > 0 ? (
              <ProjectFilter
                projects={projectList}
                value={projectId ?? null}
                onChange={setProjectId}
              />
            ) : null
          }
        />
      ) : null}

      {!noData ? (
        <PlatformTabs
          tabs={STATUS_TABS.map((tab) => ({
            id: tab.id,
            label: tab.label,
            count: tabCounts[tab.id],
          }))}
          activeId={statusTab}
          onChange={(id) => setStatusTab(id as StatusTabId)}
          ariaLabel="Workstream status"
        />
      ) : null}

      {loading ? (
        <PageLoader variant="inline" />
      ) : noData ? (
        <WorkstreamsEmptyState />
      ) : isEmpty ? (
        <WorkstreamsEmptyState variant="no-matches" />
      ) : (
        <PlatformList>
          {filtered.map((workstream) => (
            <WorkstreamObjectCard
              key={workstream.id}
              workstream={{
                id: workstream.id,
                title: workstream.title,
                summary: workstream.summary,
                status: workstream.status,
                projectId: workstream.projectId,
                sourceLabel: workstream.sourceLabel,
                startedAt: workstream.startedAt,
                lastActivityAt: workstream.lastActivityAt,
                eventCount: workstream.eventCount,
                artifactCount: workstream.artifactCount,
                decisionCount: workstream.decisionCount,
                incidentCount: workstream.incidentCount,
              }}
            />
          ))}
        </PlatformList>
      )}
    </PlatformPage>
  );
}
