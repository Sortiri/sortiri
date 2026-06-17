"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AuditReportCard } from "@/components/audits/audit-report-card";
import { InsightsFindingCard } from "@/components/insights/insights-finding-card";
import { EntityCard } from "@/components/entities/entity-card";
import { TimelineEventCard } from "@/components/timeline/timeline-event-card";
import { WorkstreamCard } from "@/components/workstreams/workstream-card";
import { SourceProjectsLabel } from "@/components/projects/source-projects-label";
import { ProjectAccessSection } from "@/components/projects/project-access-section";
import { ProjectDecisionsPanel } from "@/components/decisions/project-decisions-panel";
import { ProjectIncidentsPanel } from "@/components/incidents/project-incidents-panel";
import type { EntityRecord } from "@/types/entities";
import type { TimelineEvent, Workstream } from "@/types/events";
import type { InsightFindingDetail } from "@/types/insights";
import type { ProjectPulseCounts } from "@/types/projects";
import type { AuditReportRecord } from "@/types/audit-reports";
import "@/components/audits/audits.css";

const TRACKED_SOURCES = ["cursor", "watcher", "cli", "sdk", "github"] as const;

const PULSE_CARDS: { label: string; key: keyof ProjectPulseCounts }[] = [
  { label: "Total Events", key: "totalEvents" },
  { label: "Agent Actions", key: "agentActions" },
  { label: "Code Changes", key: "codeChanges" },
  { label: "Product Events", key: "productEvents" },
  { label: "Decisions", key: "decisions" },
  { label: "Incidents", key: "incidents" },
  { label: "Deploy Failures", key: "deployFailures" },
  { label: "Rollbacks", key: "rollbacks" },
  { label: "Revenue Events", key: "revenueEvents" },
  { label: "System Events", key: "systemEvents" },
  { label: "Active Workstreams", key: "activeWorkstreams" },
];

function ProjectLessonsPlaybooksSection({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const lessons = useQuery(api.lessons.listByProject, {
    workspaceId,
    projectId: projectId as Id<"projects">,
  });
  const playbooks = useQuery(api.playbooks.listByProject, {
    workspaceId,
    projectId: projectId as Id<"projects">,
  });

  return (
    <>
      <section className="home-section">
        <h2 className="home-section__title">Lessons</h2>
        {!lessons || lessons.length === 0 ? (
          <p className="home-section__empty">
            No lessons for this project yet.{" "}
            <Link href="/lessons">View all lessons</Link>
          </p>
        ) : (
          <ul>
            {lessons.slice(0, 5).map((lesson) => (
              <li key={lesson.id}>
                <Link href={`/lessons/${lesson.id}`}>{lesson.title}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="home-section">
        <h2 className="home-section__title">Playbooks</h2>
        {!playbooks || playbooks.length === 0 ? (
          <p className="home-section__empty">
            No playbooks for this project yet.{" "}
            <Link href="/playbooks">View all playbooks</Link>
          </p>
        ) : (
          <ul>
            {playbooks.slice(0, 5).map((playbook) => (
              <li key={playbook.id}>
                <Link href={`/playbooks/${playbook.id}`}>{playbook.title}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

type ProjectTabPanelsProps = {
  tab: string;
  workspaceId: string | null;
  projectId: string;
  pulse: {
    counts: ProjectPulseCounts;
    recentEvents: TimelineEvent[];
    activeWorkstreams: Workstream[];
    recentWorkstreams: Workstream[];
    topEntities: EntityRecord[];
    recentFindings: InsightFindingDetail[];
  };
  projectName: string;
};

export function ProjectTabPanels({
  tab,
  workspaceId,
  projectId,
  pulse,
  projectName,
}: ProjectTabPanelsProps) {
  const id = projectId as Id<"projects">;
  const recentEvents = pulse.recentEvents;
  const activeWorkstreams = pulse.activeWorkstreams;
  const recentWorkstreams = pulse.recentWorkstreams;
  const topEntities = pulse.topEntities;
  const recentFindings = pulse.recentFindings;
  const completedWorkstreams = recentWorkstreams.filter((ws) => ws.status !== "active");

  const evalSuites = useQuery(
    api.evals.listSuites,
    workspaceId ? { workspaceId, projectId: id, limit: 20 } : "skip",
  );

  const auditReports = useQuery(
    api.auditReports.listByWorkspace,
    workspaceId ? { workspaceId } : "skip",
  );

  const projectAudits = ((auditReports ?? []) as AuditReportRecord[]).filter((report) =>
    report.scope.projectIds?.includes(projectId),
  );

  switch (tab) {
    case "overview":
      return (
        <>
          <section className="home-section">
            <h2 className="home-section__title">Project Pulse</h2>
            <div className="pulse-summary">
              {PULSE_CARDS.map((card) => (
                <article key={card.key} className="pulse-summary__card">
                  <p className="pulse-summary__label">{card.label}</p>
                  <p className="pulse-summary__value">{pulse.counts[card.key] ?? 0}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="home-section">
            <div className="home-section__header">
              <h2 className="home-section__title">Recent History</h2>
              <Link href={`/timeline?projectId=${projectId}`} className="home-section__link">
                View full timeline
              </Link>
            </div>
            {recentEvents.length === 0 ? (
              <p className="home-section__empty">No events in this project yet.</p>
            ) : (
              <div className="project-detail-stack">
                {recentEvents.slice(0, 5).map((event) => (
                  <TimelineEventCard
                    key={event.id}
                    event={event}
                    workspaceId={workspaceId}
                  />
                ))}
              </div>
            )}
          </section>

          {workspaceId ? (
            <ProjectLessonsPlaybooksSection workspaceId={workspaceId} projectId={projectId} />
          ) : null}

          <section className="home-section">
            <h2 className="home-section__title">Latest Insights</h2>
            {recentFindings.length === 0 ? (
              <p className="home-section__empty">
                No project insights yet.{" "}
                <Link href={`/insights?projectId=${projectId}`}>Generate a report</Link>
              </p>
            ) : (
              <div className="project-detail-stack">
                {recentFindings.map((finding) => (
                  <InsightsFindingCard key={finding.id} finding={finding} />
                ))}
              </div>
            )}
          </section>
        </>
      );

    case "timeline":
      return (
        <section className="home-section">
          <div className="home-section__header">
            <h2 className="home-section__title">Timeline</h2>
            <Link href={`/timeline?projectId=${projectId}`} className="home-section__link">
              Open full timeline
            </Link>
          </div>
          {recentEvents.length === 0 ? (
            <p className="home-section__empty">No events in this project yet.</p>
          ) : (
            <div className="project-detail-stack">
              {recentEvents.map((event) => (
                <TimelineEventCard
                  key={event.id}
                  event={event}
                  workspaceId={workspaceId}
                />
              ))}
            </div>
          )}
        </section>
      );

    case "workstreams":
      return (
        <>
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
                {completedWorkstreams.slice(0, 10).map((workstream) => (
                  <WorkstreamCard key={workstream.id} workstream={workstream} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      );

    case "decisions":
      return workspaceId ? (
        <ProjectDecisionsPanel workspaceId={workspaceId} projectId={projectId} />
      ) : (
        <p className="home-section__empty">Select a workspace to view decisions.</p>
      );

    case "incidents":
      return workspaceId ? (
        <ProjectIncidentsPanel workspaceId={workspaceId} projectId={projectId} />
      ) : (
        <p className="home-section__empty">Select a workspace to view incidents.</p>
      );

    case "entities":
      return (
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
      );

    case "sources":
      return (
        <section className="home-section">
          <h2 className="home-section__title">Sources</h2>
          {workspaceId ? (
            <div className="project-detail-stack">
              {TRACKED_SOURCES.map((source) => (
                <SourceProjectsLabel
                  key={source}
                  workspaceId={workspaceId}
                  source={source}
                  highlightProjectId={projectId}
                />
              ))}
            </div>
          ) : (
            <p className="home-section__empty">No source activity for this project yet.</p>
          )}
        </section>
      );

    case "evals":
      return (
        <section className="home-section">
          <div className="home-section__header">
            <h2 className="home-section__title">Private Evals</h2>
            <Link href="/intelligence/evals" className="home-section__link">
              Open eval hub
            </Link>
          </div>
          {!evalSuites || evalSuites.length === 0 ? (
            <p className="home-section__empty">
              No eval suites for {projectName} yet.{" "}
              <Link href="/intelligence/evals">Create an eval suite</Link>
            </p>
          ) : (
            <ul>
              {evalSuites.map((suite) => (
                <li key={suite.id}>
                  <Link href={`/intelligence/evals/${suite.id}`}>{suite.title}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      );

    case "audits":
      return (
        <section className="home-section">
          <div className="home-section__header">
            <h2 className="home-section__title">Audit Reports</h2>
            <Link href="/audits" className="home-section__link">
              View all audits
            </Link>
          </div>
          {projectAudits.length === 0 ? (
            <p className="home-section__empty">
              No audit reports scoped to this project yet.{" "}
              <Link href="/audits">Create an audit report</Link>
            </p>
          ) : (
            <div className="project-detail-stack">
              {projectAudits.map((report) => (
                <AuditReportCard key={report.id} report={report} />
              ))}
            </div>
          )}
        </section>
      );

    case "settings":
      return workspaceId ? (
        <ProjectAccessSection workspaceId={workspaceId} projectId={id} />
      ) : (
        <p className="home-section__empty">Select a workspace to manage project settings.</p>
      );

    default:
      return null;
  }
}
