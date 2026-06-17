"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { TimelineEventCard } from "@/components/timeline/timeline-event-card";
import { TimelineFilters } from "@/components/timeline/timeline-filters";
import { RelatedHistoryPanel } from "@/components/links/related-history-panel";
import { useWorkspace } from "@/components/workspace/workspace-context";
import {
  formatEntityDate,
  formatEntityMeta,
  getEntityTypeLabel,
} from "@/lib/entities/format";
import { ProjectLink } from "@/components/projects/project-link";
import { getAskEntityHref } from "@/lib/entities/links";
import { AnalyzeImpactButton } from "@/components/impact/analyze-impact-button";
import { GenerateContextPackButton } from "@/components/context/generate-context-pack-button";
import type { TimelineViewMode } from "@/lib/events/display";
import { groupEventsByDay } from "@/lib/events/format";
import type { TimelineEvent, Workstream } from "@/types/events";
import { PageLoader } from "@/components/ui/page-loader";
import "./entities.css";

type EntityDetailPageProps = {
  entityId: string;
};

export function EntityDetailPage({ entityId }: EntityDetailPageProps) {
  const { activeWorkspaceId } = useWorkspace();
  const [viewMode, setViewMode] = useState<TimelineViewMode>("primary");
  const id = entityId as Id<"entities">;

  const timeline = useQuery(api.entities.getEntityTimeline, {
    entityId: id,
    visibility: viewMode === "raw" ? "all" : "primary",
    limit: 100,
  });

  const relatedWorkstreams = useQuery(api.entities.getRelatedWorkstreams, {
    entityId: id,
    limit: 10,
  });

  const relatedProjects = useQuery(api.entities.getProjectsForEntity, {
    entityId: id,
    limit: 10,
  });

  const entityLessons = useQuery(
    api.lessons.listByEntity,
    activeWorkspaceId
      ? { workspaceId: activeWorkspaceId, entityId: id }
      : "skip",
  );

  const eventList = (timeline?.events ?? []) as TimelineEvent[];
  const eventIds = useMemo(
    () => eventList.map((event) => event.id as Id<"events">),
    [eventList],
  );

  const linkCounts = useQuery(
    api.eventLinks.countForEvents,
    activeWorkspaceId && eventIds.length > 0
      ? { workspaceId: activeWorkspaceId, eventIds }
      : "skip",
  );

  const loading = timeline === undefined;
  const entity = timeline?.entity;
  const dayGroups = groupEventsByDay(eventList);

  if (loading) {
    return (
      <div className="entity-detail-page">
        <PageLoader variant="inline" />
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="entity-detail-page">
        <p className="entities-page__empty">Entity not found.</p>
        <Link href="/entities" className="entity-detail-page__back">
          ← Back to Entities
        </Link>
      </div>
    );
  }

  return (
    <div className="entity-detail-page">
      <Link href="/entities" className="entity-detail-page__back">
        ← Back to Entities
      </Link>

      <header className="entity-detail-header">
        <p className="entity-detail-header__type">{getEntityTypeLabel(entity.type)}</p>
        <h1 className="entity-detail-header__title">{entity.name}</h1>
        <p className="entity-detail-header__key">Key: {entity.key}</p>
        <p className="entity-detail-header__meta">{formatEntityMeta(entity)}</p>
        <p className="entity-detail-header__dates">
          First seen {formatEntityDate(entity.firstSeenAt)} · Last seen{" "}
          {formatEntityDate(entity.lastSeenAt)}
        </p>
        {entity.url ? (
          <a
            href={entity.url}
            target="_blank"
            rel="noreferrer"
            className="entity-detail-header__external"
          >
            Open external link
          </a>
        ) : null}
        <Link href={getAskEntityHref(entity)} className="entity-detail-page__ask-link">
          Ask about this entity
        </Link>
        {activeWorkspaceId ? (
          <AnalyzeImpactButton
            workspaceId={activeWorkspaceId}
            anchor={{
              type: "entity",
              entityId: entity.id,
              title: entity.name,
            }}
            className="entity-detail-page__ask-link"
            label="Analyze entity impact"
          />
        ) : null}
        {activeWorkspaceId ? (
          <GenerateContextPackButton
            workspaceId={activeWorkspaceId}
            scope={{
              entityId: entity.id,
              goal: `Work involving ${entity.name}`,
              title: `Context: ${entity.name}`,
            }}
            className="entity-detail-page__ask-link"
            label="Generate Agent Context"
          />
        ) : null}
      </header>

      {entityLessons && entityLessons.length > 0 ? (
        <section className="entity-related-workstreams">
          <h2 className="entity-section__title">Lessons</h2>
          <ul>
            {entityLessons.map((lesson) => (
              <li key={lesson.id}>
                <Link href={`/lessons/${lesson.id}`}>{lesson.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {relatedProjects && relatedProjects.length > 0 ? (
        <section className="entity-detail-projects">
          <h2 className="entity-section__title">
            {entity.type === "file" ? "Projects" : "Projects touched"}
          </h2>
          <ul className="entity-detail-projects__list">
            {relatedProjects.map((project) => (
              <li key={project.id}>
                <ProjectLink projectId={project.id} label={project.name} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {relatedWorkstreams && relatedWorkstreams.length > 0 ? (
        <section className="entity-related-workstreams">
          <h2 className="entity-section__title">Related Workstreams</h2>
          <ul className="entity-related-workstreams__list">
            {(relatedWorkstreams as Workstream[]).map((workstream) => (
              <li key={workstream.id}>
                <Link href={`/workstreams/${workstream.id}`}>{workstream.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="entity-timeline-section">
        <h2 className="entity-section__title">Entity Timeline</h2>
        <TimelineFilters
          value={null}
          onChange={() => {}}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {eventList.length === 0 ? (
          <p className="entities-page__empty">No events for this entity yet.</p>
        ) : (
          <div className="timeline-feed">
            {dayGroups.map((group) => (
              <section key={group.label} className="timeline-day-group">
                <h3 className="timeline-day-group__label">{group.label}</h3>
                <div className="timeline-day-group__events">
                  {group.events.map((event) => (
                    <TimelineEventCard
                      key={event.id}
                      event={event}
                      relatedCount={linkCounts?.[event.id] ?? 0}
                      workspaceId={activeWorkspaceId}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      {eventList.slice(0, 3).some((event) => (linkCounts?.[event.id] ?? 0) > 0) ? (
        <section className="entity-related-history">
          <h2 className="entity-section__title">Related History</h2>
          {eventList.slice(0, 3).map((event) =>
            (linkCounts?.[event.id] ?? 0) > 0 ? (
              <RelatedHistoryPanel
                key={event.id}
                eventId={event.id}
                relatedCount={linkCounts?.[event.id] ?? 0}
              />
            ) : null,
          )}
        </section>
      ) : null}
    </div>
  );
}
