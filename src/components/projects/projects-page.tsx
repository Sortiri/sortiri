"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import {
  PlatformEmptyState,
  PlatformFilterBar,
  PlatformGrid,
  PlatformOverflowMenu,
  PlatformPage,
  PlatformPageActions,
  PlatformPageHeader,
  ProjectCard,
} from "@/components/platform";
import { PageLoader } from "@/components/ui/page-loader";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import "./projects.css";

type StatusFilter = "all" | "active" | "archived";
type SourceFilter = "all" | "github" | "cli" | "sdk" | "webhooks" | "cursor";
type SortOption = "activity" | "name" | "eventsToday";

const isDev = process.env.NODE_ENV === "development";

export function ProjectsPage() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canRepair = capabilities?.canManageMembers ?? false;
  const [repairError, setRepairError] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [sort, setSort] = useState<SortOption>("activity");

  const summaries = useQuery(
    api.projects.listProjectSummaries,
    activeWorkspaceId
      ? { workspaceId: activeWorkspaceId, status: statusFilter }
      : "skip",
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

  const filtered = useMemo(() => {
    let list = [...(summaries ?? [])];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description?.toLowerCase().includes(q) ?? false) ||
          (p.repositoryUrl?.toLowerCase().includes(q) ?? false),
      );
    }
    if (sourceFilter !== "all") {
      const sourceKey =
        sourceFilter === "cursor"
          ? "cursor"
          : sourceFilter === "github"
            ? "github"
            : sourceFilter === "cli"
              ? "cli"
              : sourceFilter === "sdk"
                ? "sdk"
                : "webhook";
      list = list.filter((p) =>
        p.connectedSources.some((s) => s.toLowerCase().includes(sourceKey)),
      );
    }
    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "eventsToday") return b.eventsToday - a.eventsToday;
      return (b.lastEventAt ?? 0) - (a.lastEventAt ?? 0);
    });
    return list;
  }, [summaries, search, sourceFilter, sort]);

  const loading = wsLoading || (activeWorkspaceId !== null && summaries === undefined);
  const isEmpty = !loading && filtered.length === 0;
  const noData = !loading && (summaries?.length ?? 0) === 0;

  const overflowItems =
    isDev && canRepair
      ? [
          {
            label: repairing ? "Repairing…" : "Repair project scope",
            onClick: () => void handleRepair(),
            disabled: repairing,
          },
        ]
      : [];

  return (
    <PlatformPage className="projects-page">
      <PlatformPageHeader
        title="Projects"
        subtitle="Apps, repos, and products with their own company timelines."
        actions={
          <PlatformPageActions
            primary={{
              label: "Create project",
              href: "/sources",
              title: "Connect sources or run sortiri init to create projects",
            }}
            overflow={
              overflowItems.length > 0 ? (
                <PlatformOverflowMenu items={overflowItems} label="Developer actions" />
              ) : undefined
            }
          />
        }
      />

      {repairError ? <p className="projects-page__error">{repairError}</p> : null}

      {!noData ? (
        <PlatformFilterBar
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search projects…",
            label: "Search projects",
          }}
          controls={
            <>
              <label className="projects-page__filter">
                <span className="projects-page__filter-label">Status</span>
                <select
                  className="projects-page__filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label className="projects-page__filter">
                <span className="projects-page__filter-label">Source</span>
                <select
                  className="projects-page__filter-select"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
                >
                  <option value="all">All</option>
                  <option value="github">GitHub</option>
                  <option value="cli">CLI</option>
                  <option value="sdk">SDK</option>
                  <option value="cursor">MCP</option>
                  <option value="webhooks">Webhooks</option>
                </select>
              </label>
              <label className="projects-page__filter">
                <span className="projects-page__filter-label">Sort</span>
                <select
                  className="projects-page__filter-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                >
                  <option value="activity">Last activity</option>
                  <option value="name">Name</option>
                  <option value="eventsToday">Events today</option>
                </select>
              </label>
            </>
          }
        />
      ) : null}

      {loading ? (
        <PageLoader variant="inline" />
      ) : noData ? (
        <PlatformEmptyState
          title="No projects yet"
          body="Projects group your agent work, code changes, product events, decisions, incidents, and outcomes."
          actions={[
            { label: "Create project", href: "/sources" },
            { label: "Install CLI", href: "/sources#connections" },
          ]}
        />
      ) : isEmpty ? (
        <PlatformEmptyState
          title="No matching projects"
          body="Try adjusting your search or filters."
        />
      ) : (
        <PlatformGrid columns={2}>
          {filtered.map((project) => (
            <ProjectCard
              key={project.projectId}
              project={{
                projectId: project.projectId,
                name: project.name,
                description: project.description,
                repositoryUrl: project.repositoryUrl,
                status: project.status,
                eventsToday: project.eventsToday,
                activeWorkstreams: project.activeWorkstreams,
                openIncidents: project.openIncidents,
                pendingDecisions: project.pendingDecisions,
                connectedSources: project.connectedSources,
                lastEventAt: project.lastEventAt,
              }}
            />
          ))}
        </PlatformGrid>
      )}
    </PlatformPage>
  );
}
