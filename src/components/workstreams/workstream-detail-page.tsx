"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { WorkstreamRelatedHistorySection } from "@/components/links/workstream-related-history-section";
import { getTimelineEventDomId } from "@/lib/links/navigation";
import { PinReplayButton } from "@/components/pinned-replays/pin-replay-button";
import "@/components/pinned-replays/pin-replay-button.css";
import { ReplayTimeline } from "@/components/workstreams/replay-timeline";
import { WorkstreamArtifactsSection } from "@/components/workstreams/workstream-artifacts-section";
import { WorkstreamStatusBadge } from "@/components/workstreams/workstream-status-badge";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { filterReplayEvents } from "@/lib/events/display";
import {
  formatWorkstreamDateTime,
  getCreatedByLabel,
} from "@/lib/workstreams/format";
import type { TimelineEvent, Workstream } from "@/types/events";
import "./workstreams.css";

type WorkstreamDetailPageProps = {
  workstreamId: string;
};

export function WorkstreamDetailPage({ workstreamId }: WorkstreamDetailPageProps) {
  const { activeWorkspaceId } = useWorkspace();
  const searchParams = useSearchParams();
  const focusEventId = searchParams.get("eventId");
  const [showRawEvents, setShowRawEvents] = useState(false);
  const id = workstreamId as Id<"workstreams">;

  const workstream = useQuery(api.workstreams.getById, { workstreamId: id });
  const events = useQuery(
    api.events.listByWorkstream,
    workstream ? { workstreamId: id, limit: 100 } : "skip",
  );
  const relatedGroups = useQuery(
    api.eventLinks.listForWorkstream,
    workstream ? { workstreamId: id, limit: 30 } : "skip",
  );

  useEffect(() => {
    if (!focusEventId || events === undefined) return;
    const element = document.getElementById(getTimelineEventDomId(focusEventId));
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusEventId, events]);

  const loading = workstream === undefined;
  const notFound = workstream === null;

  if (loading) {
    return (
      <div className="workstream-detail-page">
        <p className="workstreams-page__loading">Loading workstream…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="workstream-detail-page">
        <div className="workstream-not-found">
          <p className="workstream-not-found__title">Workstream not found</p>
          <Link href="/workstreams" className="workstream-detail-page__back">
            ← Back to Workstreams
          </Link>
        </div>
      </div>
    );
  }

  const ws = workstream as Workstream;
  const eventList = (events ?? []) as TimelineEvent[];
  const replayEvents = useMemo(
    () => filterReplayEvents(eventList, showRawEvents),
    [eventList, showRawEvents],
  );
  const createdBy = getCreatedByLabel(ws.createdBy);
  const started = formatWorkstreamDateTime(ws.startedAt);
  const ended = ws.endedAt ? formatWorkstreamDateTime(ws.endedAt) : null;

  const metaParts = [createdBy, `started ${started}`];
  if (ended) {
    metaParts.push(`ended ${ended}`);
  }

  return (
    <div className="workstream-detail-page">
      <Link href="/workstreams" className="workstream-detail-page__back">
        ← Back to Workstreams
      </Link>

      <header className="workstream-detail-header">
        <div className="workstream-detail-header__title-row">
          <h1 className="workstream-detail-header__title">{ws.title}</h1>
          <div className="workstream-detail-header__actions">
            {activeWorkspaceId ? (
              <PinReplayButton
                workspaceId={activeWorkspaceId}
                workstreamId={ws.id}
              />
            ) : null}
            <WorkstreamStatusBadge status={ws.status} />
          </div>
        </div>
        {ws.summary ? (
          <p className="workstream-detail-header__summary">{ws.summary}</p>
        ) : null}
        <p className="workstream-detail-header__meta">{metaParts.join(" · ")}</p>
        <Link
          href={`/ask?workstreamId=${ws.id}`}
          className="workstream-detail-page__ask-link"
        >
          Ask about this replay
        </Link>
      </header>

      {relatedGroups && relatedGroups.length > 0 ? (
        <WorkstreamRelatedHistorySection groups={relatedGroups} />
      ) : null}

      <WorkstreamArtifactsSection workstreamId={ws.id} />

      <label className="workstream-raw-toggle">
        <input
          type="checkbox"
          checked={showRawEvents}
          onChange={(event) => setShowRawEvents(event.target.checked)}
        />
        Show raw events
      </label>

      {events === undefined ? (
        <p className="workstreams-page__loading">Loading replay…</p>
      ) : (
        <ReplayTimeline events={replayEvents} focusEventId={focusEventId} />
      )}
    </div>
  );
}
