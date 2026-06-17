"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Suspense } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  ObjectHeader,
  ObjectTabs,
  useObjectTab,
} from "@/components/platform";
import { AnalyzeImpactButton } from "@/components/impact/analyze-impact-button";
import { GenerateContextPackButton } from "@/components/context/generate-context-pack-button";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { ProjectTabPanels } from "@/components/projects/project-tab-panels";
import { PageLoader } from "@/components/ui/page-loader";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { formatProjectLastActivity } from "@/lib/projects/format";
import type { EntityRecord } from "@/types/entities";
import type { TimelineEvent, Workstream } from "@/types/events";
import type { InsightFindingDetail } from "@/types/insights";
import "@/components/home/home.css";
import "@/components/entities/entities.css";
import "./projects.css";

import { PROJECT_TABS, type ProjectTabId } from "@/lib/platform/project-tabs";

type ProjectDetailPageProps = {
  projectId: string;
};

function ProjectDetailPageContent({ projectId }: ProjectDetailPageProps) {
  const { activeWorkspaceId } = useWorkspace();
  const activeTab = useObjectTab<ProjectTabId>(PROJECT_TABS.map((t) => t.id), "overview");
  const id = projectId as Id<"projects">;
  const basePath = `/projects/${projectId}`;

  const project = useQuery(
    api.projects.getById,
    activeWorkspaceId
      ? { workspaceId: activeWorkspaceId, projectId: id }
      : "skip",
  );

  const pulse = useQuery(
    api.projects.getProjectPulse,
    activeWorkspaceId
      ? { workspaceId: activeWorkspaceId, projectId: id, window: "7d" }
      : "skip",
  );

  const loading = project === undefined || pulse === undefined;

  if (loading) {
    return (
      <div className="project-detail-page">
        <PageLoader variant="inline" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-detail-page">
        <ObjectHeader title="Project not found" backHref="/projects" backLabel="Projects" />
        <p className="home-section__empty">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="project-detail-page">
      <ObjectHeader
        title={project.name}
        description={project.repositoryUrl}
        backHref="/projects"
        backLabel="Projects"
        badges={<ProjectStatusBadge status={project.status} />}
        meta={
          <p className="project-detail-header__meta">
            Last activity {formatProjectLastActivity(project.lastEventAt)}
          </p>
        }
        actions={
          <nav className="quick-actions" aria-label="Project actions">
            <Link href={`/ask?projectId=${project.id}`} className="quick-actions__link">
              Ask about this project
            </Link>
            {activeWorkspaceId ? (
              <AnalyzeImpactButton
                workspaceId={activeWorkspaceId}
                anchor={{
                  type: "project",
                  projectId: project.id,
                  title: project.name,
                }}
                projectId={project.id}
                className="quick-actions__link"
                label="Analyze project impact"
              />
            ) : null}
            {activeWorkspaceId ? (
              <GenerateContextPackButton
                workspaceId={activeWorkspaceId}
                scope={{
                  projectId: project.id,
                  goal: `Work on ${project.name}`,
                  title: `Context: ${project.name}`,
                }}
                className="quick-actions__link"
              />
            ) : null}
            <Link href={`/timeline?projectId=${project.id}`} className="quick-actions__link">
              View full timeline
            </Link>
            <Link href="/sources" className="quick-actions__link">
              Open sources
            </Link>
          </nav>
        }
      />

      <ObjectTabs
        tabs={[...PROJECT_TABS]}
        activeTab={activeTab}
        defaultTab="overview"
        basePath={basePath}
        ariaLabel="Project sections"
      />

      <ProjectTabPanels
        tab={activeTab}
        workspaceId={activeWorkspaceId}
        projectId={project.id}
        projectName={project.name}
        pulse={{
          counts: pulse.counts,
          recentEvents: (pulse.recentEvents ?? []) as TimelineEvent[],
          activeWorkstreams: (pulse.activeWorkstreams ?? []) as Workstream[],
          recentWorkstreams: (pulse.recentWorkstreams ?? []) as Workstream[],
          topEntities: (pulse.topEntities ?? []) as EntityRecord[],
          recentFindings: (pulse.recentFindings ?? []) as InsightFindingDetail[],
        }}
      />
    </div>
  );
}

export function ProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  return (
    <Suspense
      fallback={
        <div className="project-detail-page">
          <PageLoader variant="inline" />
        </div>
      }
    >
      <ProjectDetailPageContent projectId={projectId} />
    </Suspense>
  );
}
