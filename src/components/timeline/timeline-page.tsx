"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { GenerateRelatedHistoryButton } from "@/components/links/generate-related-history-button";
import { SearchResultItem } from "@/components/search/search-result-item";
import { TimelineEmptyState } from "@/components/timeline/timeline-empty-state";
import { TimelineEventCard } from "@/components/timeline/timeline-event-card";
import { TimelineFilters } from "@/components/timeline/timeline-filters";
import { TimelineSearch } from "@/components/timeline/timeline-search";
import { TimelineSearchEmptyState } from "@/components/timeline/timeline-search-empty";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getTimelineEventDomId } from "@/lib/links/navigation";
import { groupEventsByDay } from "@/lib/events/format";
import type { TimelineViewMode } from "@/lib/events/display";
import type { TimelineFilterValue } from "@/lib/events/labels";
import { ProjectFilter } from "@/components/projects/project-filter";
import { useProjectFilter } from "@/hooks/use-project-filter";
import { useWorkspace } from "@/components/workspace/workspace-context";
import type { TimelineEvent } from "@/types/events";
import { buildEntityResolveCandidates } from "@/components/entities/entity-link";
import "./timeline.css";

const isDev = process.env.NODE_ENV === "development";

export function TimelinePage() {
  const searchParams = useSearchParams();
  const focusEventId = searchParams.get("eventId");
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const { projectId, projectList, setProjectId } = useProjectFilter(activeWorkspaceId);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TimelineFilterValue>(null);
  const [viewMode, setViewMode] = useState<TimelineViewMode>("primary");
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [backfillError, setBackfillError] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [displayBackfillError, setDisplayBackfillError] = useState<string | null>(null);
  const [displayBackfilling, setDisplayBackfilling] = useState(false);
  const [entitiesBackfillError, setEntitiesBackfillError] = useState<string | null>(null);
  const [entitiesBackfilling, setEntitiesBackfilling] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 250);
  const isSearching = debouncedQuery.trim().length > 0;

  const events = useQuery(
    isSearching ? api.events.search : api.events.listByWorkspace,
    activeWorkspaceId
      ? {
          workspaceId: activeWorkspaceId,
          ...(isSearching
            ? { query: debouncedQuery, includeDebug: true, includeHidden: false }
            : { visibility: viewMode === "raw" ? "all" : "primary" }),
          category: category ?? undefined,
          projectId,
          limit: 50,
        }
      : "skip",
  );

  const seedMutation = useMutation(api.devSeed.seedTimelineEvents);
  const backfillMutation = useMutation(api.devSeed.backfillSearchText);
  const backfillDisplayMutation = useMutation(api.events.backfillDisplayFields);
  const backfillEntitiesMutation = useMutation(api.entities.backfillForWorkspace);

  const handleSeed = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setSeedError(null);
    setSeeding(true);
    try {
      await seedMutation({ workspaceId: activeWorkspaceId });
    } catch (err) {
      setSeedError(err instanceof Error ? err.message : "Could not add sample events");
    } finally {
      setSeeding(false);
    }
  }, [activeWorkspaceId, seedMutation]);

  const handleBackfill = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setBackfillError(null);
    setBackfilling(true);
    try {
      await backfillMutation({ workspaceId: activeWorkspaceId });
    } catch (err) {
      setBackfillError(err instanceof Error ? err.message : "Could not backfill search text");
    } finally {
      setBackfilling(false);
    }
  }, [activeWorkspaceId, backfillMutation]);

  const handleBackfillDisplay = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setDisplayBackfillError(null);
    setDisplayBackfilling(true);
    try {
      await backfillDisplayMutation({ workspaceId: activeWorkspaceId });
    } catch (err) {
      setDisplayBackfillError(
        err instanceof Error ? err.message : "Could not backfill display fields",
      );
    } finally {
      setDisplayBackfilling(false);
    }
  }, [activeWorkspaceId, backfillDisplayMutation]);

  const handleBackfillEntities = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setEntitiesBackfillError(null);
    setEntitiesBackfilling(true);
    try {
      await backfillEntitiesMutation({ workspaceId: activeWorkspaceId });
    } catch (err) {
      setEntitiesBackfillError(
        err instanceof Error ? err.message : "Could not backfill entities",
      );
    } finally {
      setEntitiesBackfilling(false);
    }
  }, [activeWorkspaceId, backfillEntitiesMutation]);

  const loading = wsLoading || (activeWorkspaceId !== null && events === undefined);
  const eventList = (events ?? []) as TimelineEvent[];
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

  const entityCandidates = useMemo(
    () => buildEntityResolveCandidates(eventList),
    [eventList],
  );

  const entityResolveMap = useQuery(
    api.entities.resolveMany,
    activeWorkspaceId && entityCandidates.length > 0
      ? { workspaceId: activeWorkspaceId, candidates: entityCandidates }
      : "skip",
  );

  const dayGroups = groupEventsByDay(eventList);
  const isEmpty = !loading && eventList.length === 0;
  const showTimelineEmpty = isEmpty && !isSearching;
  const showSearchEmpty = isEmpty && isSearching;

  useEffect(() => {
    if (!focusEventId) return;
    const element = document.getElementById(getTimelineEventDomId(focusEventId));
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusEventId, eventList]);

  return (
    <div className="timeline-page">
      <header className="timeline-page__header">
        <div className="timeline-page__header-row">
          <h1 className="timeline-page__title">Timeline</h1>
          <div className="timeline-page__header-actions">
            {activeWorkspaceId ? (
              <GenerateRelatedHistoryButton workspaceId={activeWorkspaceId} />
            ) : null}
            {isDev && activeWorkspaceId ? (
              <div className="timeline-page__dev-actions">
              <button
                type="button"
                className="timeline-page__dev-action"
                onClick={() => void handleBackfillEntities()}
                disabled={entitiesBackfilling}
              >
                {entitiesBackfilling ? "Backfilling…" : "Backfill entities"}
              </button>
              <button
                type="button"
                className="timeline-page__dev-action"
                onClick={() => void handleBackfillDisplay()}
                disabled={displayBackfilling}
              >
                {displayBackfilling ? "Backfilling…" : "Backfill display"}
              </button>
              <button
                type="button"
                className="timeline-page__dev-action"
                onClick={() => void handleBackfill()}
                disabled={backfilling}
              >
                {backfilling ? "Backfilling…" : "Backfill search"}
              </button>
              <button
                type="button"
                className="timeline-page__dev-action"
                onClick={() => void handleSeed()}
                disabled={seeding}
              >
                {seeding ? "Adding…" : "Add sample events"}
              </button>
            </div>
            ) : null}
          </div>
        </div>
        <p className="timeline-page__subtitle">
          Every agent action, product event, and company decision in one searchable
          history.
        </p>
        <Link href="/ask" className="timeline-page__ask-link">
          Ask about this timeline
        </Link>
      </header>

      {seedError ? <p className="timeline-page__error">{seedError}</p> : null}
      {backfillError ? <p className="timeline-page__error">{backfillError}</p> : null}
      {displayBackfillError ? (
        <p className="timeline-page__error">{displayBackfillError}</p>
      ) : null}
      {entitiesBackfillError ? (
        <p className="timeline-page__error">{entitiesBackfillError}</p>
      ) : null}

      <TimelineSearch value={query} onChange={setQuery} />
      {projectList.length > 0 ? (
        <ProjectFilter
          projects={projectList}
          value={projectId ?? null}
          onChange={setProjectId}
        />
      ) : null}
      <TimelineFilters
        value={category}
        onChange={setCategory}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {isSearching && !loading ? (
        <div className="timeline-search-results-header">
          <p className="timeline-search-results-header__title">
            Search results for &ldquo;{debouncedQuery}&rdquo;
          </p>
          <p className="timeline-search-results-header__count">
            {eventList.length} event{eventList.length === 1 ? "" : "s"} found
          </p>
        </div>
      ) : null}

      {loading ? (
        <p className="timeline-page__loading">Loading events…</p>
      ) : showSearchEmpty ? (
        <TimelineSearchEmptyState />
      ) : showTimelineEmpty ? (
        <TimelineEmptyState
          onSeed={() => void handleSeed()}
          seeding={seeding}
          showSeedAction={isDev && Boolean(activeWorkspaceId)}
        />
      ) : isSearching ? (
        <div className="timeline-search-results">
          {eventList.map((event) => (
            <SearchResultItem
              key={event.id}
              event={event}
              query={debouncedQuery}
              relatedCount={linkCounts?.[event.id] ?? 0}
            />
          ))}
        </div>
      ) : (
        <div className="timeline-feed">
          {dayGroups.map((group) => (
            <section key={group.label} className="timeline-day-group">
              <h2 className="timeline-day-group__label">{group.label}</h2>
              <div className="timeline-day-group__events">
                {group.events.map((event) => (
                  <TimelineEventCard
                    key={event.id}
                    event={event}
                    relatedCount={linkCounts?.[event.id] ?? 0}
                    focused={focusEventId === event.id}
                    entityResolveMap={entityResolveMap}
                    workspaceId={activeWorkspaceId}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
