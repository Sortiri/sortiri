"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { InsightsFindingCard } from "@/components/insights/insights-finding-card";
import { EntityCard } from "@/components/entities/entity-card";
import { TimelineEventCard } from "@/components/timeline/timeline-event-card";
import { WorkstreamCard } from "@/components/workstreams/workstream-card";
import { SourceProjectsLabel } from "@/components/projects/source-projects-label";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { formatProjectLastActivity } from "@/lib/projects/format";
import type { EntityRecord } from "@/types/entities";
import type { TimelineEvent, Workstream } from "@/types/events";
import type { InsightFindingDetail } from "@/types/insights";
import type { ProjectPulseCounts } from "@/types/projects";
import "@/components/home/home.css";
import "@/components/entities/entities.css";
import "./projects.css";

const PULSE_CARDS: { label: string; key: keyof ProjectPulseCounts }[] = [
  { label: "Total Events", key: "totalEvents" },
  { label: "Agent Actions", key: "agentActions" },
  { label: "Code Changes", key: "codeChanges" },
  { label: "Product Events", key: "productEvents" },
  { label: "Decisions", key: "decisions" },
  { label: "Revenue Events", key: "revenueEvents" },
  { label: "System Events", key: "systemEvents" },
  { label: "Active Workstreams", key: "activeWorkstreams" },
];

const TRACKED_SOURCES = ["cursor", "watcher", "cli", "sdk", "github"] as const;

type ProjectDetailPageProps = {
  projectId: string;
};

export function ProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  const { activeWorkspaceId } = useWorkspace();
  const id = projectId as Id<"projects">;

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
        <p className="projects-page__loading">Loading project…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-detail-page">
        <Link href="/projects" className="project-detail-page__back">
          ← Back to Projects
        </Link>
        <p className="home-section__empty">Project not found.</p>
      </div>
    );
  }

  const recentEvents = (pulse.recentEvents ?? []) as TimelineEvent[];
  const activeWorkstreams = (pulse.activeWorkstreams ?? []) as Workstream[];
  const recentWorkstreams = (pulse.recentWorkstreams ?? []) as Workstream[];
  const topEntities = (pulse.topEntities ?? []) as EntityRecord[];
  const recentFindings = (pulse.recentFindings ?? []) as InsightFindingDetail[];
  const completedWorkstreams = recentWorkstreams.filter((ws) => ws.status !== "active");

  return (
    <div className="project-detail-page">
      <Link href="/projects" className="project-detail-page__back">
        ← Back to Projects
      </Link>

      <header className="project-detail-header">
        <div className="project-card__top">
          <h1 className="project-detail-header__title">{project.name}</h1>
          <ProjectStatusBadge status={project.status} />
        </div>
        {project.repositoryUrl ? (
          <p className="project-detail-header__repo">{project.repositoryUrl}</p>
        ) : null}
        <p className="project-detail-header__meta">
          Last activity {formatProjectLastActivity(project.lastEventAt)}
        </p>
      </header>

      <nav className="quick-actions" aria-label="Project actions">
        <Link href={`/ask?projectId=${project.id}`} className="quick-actions__link">
          Ask about this project
        </Link>
        <Link href={`/timeline?projectId=${project.id}`} className="quick-actions__link">
          View full timeline
        </Link>
        <Link href="/sources" className="quick-actions__link">
          Open sources
        </Link>
      </nav>

      <section className="home-section">
        <h2 className="home-section__title">Project Pulse</h2>
        <div className="pulse-summary">
          {PULSE_CARDS.map((card) => (
            <article key={card.key} className="pulse-summary__card">
              <p className="pulse-summary__label">{card.label}</p>
              <p className="pulse-summary__value">{pulse.counts[card.key]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section">
        <h2 className="home-section__title">Recent History</h2>
        {recentEvents.length === 0 ? (
          <p className="home-section__empty">No events in this project yet.</p>
        ) : (
          <div className="project-detail-stack">
            {recentEvents.map((event) => (
              <TimelineEventCard
                key={event.id}
                event={event}
                workspaceId={activeWorkspaceId}
              />
            ))}
          </div>
        )}
      </section>

      <section className="home-section">
        <h2 className="home-section__title">Active Workstreams</h2>
        {activeWorkstreams.length === 0 ? (
          <p className="home-section__empty">No active workstreams.</p>
        ) : (
          <div className="project-detail-stack">
            {activeWorkstreams.map((workstream) => (
              <WorkstreamCard key={workstream.id} workstream={workstream} />
            ))}
          </div>
        )}
      </section>

      {completedWorkstreams.length > 0 ? (
        <section className="home-section">
          <h2 className="home-section__title">Recent Completed Workstreams</h2>
          <div className="project-detail-stack">
            {completedWorkstreams.slice(0, 5).map((workstream) => (
              <WorkstreamCard key={workstream.id} workstream={workstream} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="home-section">
        <h2 className="home-section__title">Top Entities</h2>
        {topEntities.length === 0 ? (
          <p className="home-section__empty">No entities linked to this project yet.</p>
        ) : (
          <div className="entities-list">
            {topEntities.map((entity) => (
              <EntityCard key={entity.id} entity={entity} />
            ))}
          </div>
        )}
      </section>

      <section className="home-section">
        <h2 className="home-section__title">Latest Insights</h2>
        {recentFindings.length === 0 ? (
          <p className="home-section__empty">
            No project insights yet.{" "}
            <Link href={`/insights?projectId=${project.id}`}>Generate a report</Link>
          </p>
        ) : (
          <div className="project-detail-stack">
            {recentFindings.map((finding) => (
              <InsightsFindingCard key={finding.id} finding={finding} />
            ))}
          </div>
        )}
      </section>

      <section className="home-section">
        <h2 className="home-section__title">Sources</h2>
        {activeWorkspaceId ? (
          <div className="project-detail-stack">
            {TRACKED_SOURCES.map((source) => (
              <SourceProjectsLabel
                key={source}
                workspaceId={activeWorkspaceId}
                source={source}
                highlightProjectId={project.id}
              />
            ))}
          </div>
        ) : (
          <p className="home-section__empty">No source activity for this project yet.</p>
        )}
      </section>
    </div>
  );
}
