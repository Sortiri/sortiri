"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { SearchResultItem } from "@/components/search/search-result-item";
import { TimelineEmptyState } from "@/components/timeline/timeline-empty-state";
import { TimelineEventCard } from "@/components/timeline/timeline-event-card";
import { TimelineFilters } from "@/components/timeline/timeline-filters";
import {
  TIMELINE_DENSITY_STORAGE_KEY,
  TimelineDensityToggle,
  type TimelineDensity,
} from "@/components/timeline/timeline-density-toggle";
import { TimelineSearchEmptyState } from "@/components/timeline/timeline-search-empty";
import {
  PlatformFilterBar,
  PlatformOverflowMenu,
  PlatformPage,
  PlatformPageActions,
  PlatformPageHeader,
} from "@/components/platform";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getTimelineEventDomId } from "@/lib/links/navigation";
import {
  filterEventsByTimeRange,
  groupEventsByRecency,
} from "@/lib/platform/timeline-grouping";
import type { TimelineViewMode } from "@/lib/events/display";
import type { TimelineFilterValue } from "@/lib/events/labels";
import { ProjectFilter } from "@/components/projects/project-filter";
import { useProjectFilter } from "@/hooks/use-project-filter";
import { PageLoader } from "@/components/ui/page-loader";
import { useWorkspace } from "@/components/workspace/workspace-context";
import type { TimelineEvent } from "@/types/events";
import { buildEntityResolveCandidates } from "@/components/entities/entity-link";
import "./timeline.css";

const isDev = process.env.NODE_ENV === "development";

type TimeRange = "24h" | "7d" | "30d" | "all";

function readStoredTimelineDensity(): TimelineDensity {
  if (typeof window === "undefined") return "comfortable";
  const stored = localStorage.getItem(TIMELINE_DENSITY_STORAGE_KEY);
  return stored === "compact" || stored === "comfortable" ? stored : "comfortable";
}

export function TimelinePage() {
  const searchParams = useSearchParams();
  const focusEventId = searchParams.get("eventId");
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const { projectId, projectList, setProjectId } = useProjectFilter(activeWorkspaceId);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TimelineFilterValue>(null);
  const [viewMode, setViewMode] = useState<TimelineViewMode>("primary");
  const [density, setDensity] = useState<TimelineDensity>(readStoredTimelineDensity);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [backfillError, setBackfillError] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [displayBackfillError, setDisplayBackfillError] = useState<string | null>(null);
  const [displayBackfilling, setDisplayBackfilling] = useState(false);
  const [entitiesBackfillError, setEntitiesBackfillError] = useState<string | null>(null);
  const [entitiesBackfilling, setEntitiesBackfilling] = useState(false);
  const [relatedGenerating, setRelatedGenerating] = useState(false);

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
  const generateRelatedMutation = useMutation(api.eventLinks.generateForWorkspace);

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

  const handleGenerateRelated = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setRelatedGenerating(true);
    try {
      await generateRelatedMutation({ workspaceId: activeWorkspaceId, window: "7d" });
    } finally {
      setRelatedGenerating(false);
    }
  }, [activeWorkspaceId, generateRelatedMutation]);

  const loading = wsLoading || (activeWorkspaceId !== null && events === undefined);
  const rawEventList = (events ?? []) as TimelineEvent[];
  const eventList = useMemo(
    () => (isSearching ? rawEventList : filterEventsByTimeRange(rawEventList, timeRange)),
    [rawEventList, timeRange, isSearching],
  );
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

  const recencyGroups = useMemo(() => groupEventsByRecency(eventList), [eventList]);
  const isEmpty = !loading && eventList.length === 0;
  const showTimelineEmpty = isEmpty && !isSearching;
  const showSearchEmpty = isEmpty && isSearching;

  const handleDensityChange = useCallback((next: TimelineDensity) => {
    setDensity(next);
    localStorage.setItem(TIMELINE_DENSITY_STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    if (!focusEventId) return;
    const element = document.getElementById(getTimelineEventDomId(focusEventId));
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusEventId, eventList]);

  const devOverflowItems = isDev
    ? [
        {
          label: relatedGenerating ? "Generating…" : "Generate related history",
          onClick: () => void handleGenerateRelated(),
          disabled: relatedGenerating || !activeWorkspaceId,
        },
        {
          label: entitiesBackfilling ? "Backfilling…" : "Backfill entities",
          onClick: () => void handleBackfillEntities(),
          disabled: entitiesBackfilling,
        },
        {
          label: displayBackfilling ? "Backfilling…" : "Backfill display",
          onClick: () => void handleBackfillDisplay(),
          disabled: displayBackfilling,
        },
        {
          label: backfilling ? "Backfilling…" : "Backfill search",
          onClick: () => void handleBackfill(),
          disabled: backfilling,
        },
        {
          label: seeding ? "Adding…" : "Add sample events",
          onClick: () => void handleSeed(),
          disabled: seeding,
        },
      ]
    : [];

  return (
    <PlatformPage className="timeline-page">
      <PlatformPageHeader
        title="Timeline"
        subtitle="Every agent action, product event, decision, incident, and outcome in one searchable history."
        actions={
          <PlatformPageActions
            secondary={[{ label: "Ask about this timeline", href: "/ask" }]}
            primary={{ label: "Add event", href: "/sources" }}
            overflow={
              devOverflowItems.length > 0 ? (
                <PlatformOverflowMenu items={devOverflowItems} label="Developer actions" />
              ) : undefined
            }
          />
        }
      />

      {seedError ? <p className="timeline-page__error">{seedError}</p> : null}
      {backfillError ? <p className="timeline-page__error">{backfillError}</p> : null}
      {displayBackfillError ? (
        <p className="timeline-page__error">{displayBackfillError}</p>
      ) : null}
      {entitiesBackfillError ? (
        <p className="timeline-page__error">{entitiesBackfillError}</p>
      ) : null}

      <PlatformFilterBar
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search company history…",
          label: "Search timeline",
        }}
        controls={
          <>
            {projectList.length > 0 ? (
              <ProjectFilter
                projects={projectList}
                value={projectId ?? null}
                onChange={setProjectId}
              />
            ) : null}
            <label className="timeline-page__filter">
              <span className="timeline-page__filter-label">Time range</span>
              <select
                className="timeline-page__filter-select"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              >
                <option value="24h">24h</option>
                <option value="7d">7d</option>
                <option value="30d">30d</option>
                <option value="all">All</option>
              </select>
            </label>
            <TimelineDensityToggle value={density} onChange={handleDensityChange} />
          </>
        }
        chips={
          <TimelineFilters
            value={category}
            onChange={setCategory}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            hideHubLinks
          />
        }
        secondary={
          <div className="platform-hub-pills">
            <Link href="/timeline/decisions" className="platform-hub-pill">
              Decision hub
            </Link>
            <Link href="/timeline/incidents" className="platform-hub-pill">
              Incident hub
            </Link>
          </div>
        }
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
        <PageLoader variant="inline" />
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
        <div
          className={`timeline-feed${density === "compact" ? " timeline-feed--compact" : ""}`}
        >
          {recencyGroups.map((group) => (
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
    </PlatformPage>
  );
}
