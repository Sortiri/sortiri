"use client";

import { useQuery } from "convex/react";
import { ReplayEvent } from "@/components/workstreams/replay-event";
import { buildEntityResolveCandidates } from "@/components/entities/entity-link";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { api } from "../../../convex/_generated/api";
import type { TimelineEvent } from "@/types/events";
import { useMemo } from "react";

type ReplayTimelineProps = {
  events: TimelineEvent[];
  focusEventId?: string | null;
  disableEntityResolve?: boolean;
};

export function ReplayTimeline({
  events,
  focusEventId,
  disableEntityResolve = false,
}: ReplayTimelineProps) {
  const { activeWorkspaceId } = useWorkspace();

  const entityCandidates = useMemo(
    () => (disableEntityResolve ? [] : buildEntityResolveCandidates(events)),
    [disableEntityResolve, events],
  );

  const entityResolveMap = useQuery(
    api.entities.resolveMany,
    activeWorkspaceId && entityCandidates.length > 0
      ? { workspaceId: activeWorkspaceId, candidates: entityCandidates }
      : "skip",
  );

  if (events.length === 0) {
    return (
      <p className="workstreams-page__loading">No events recorded for this workstream yet.</p>
    );
  }

  return (
    <div className="replay-timeline">
      {events.map((event) => (
        <ReplayEvent
          key={event.id}
          event={event}
          focused={focusEventId === event.id}
          entityResolveMap={entityResolveMap}
        />
      ))}
    </div>
  );
}
