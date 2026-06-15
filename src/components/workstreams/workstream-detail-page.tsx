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
import { WorkstreamAgentContextPanel } from "@/components/context/workstream-agent-context-panel";
import { WorkstreamPrivateEvalsPanel } from "@/components/evals/workstream-private-evals-panel";
import { RemediationWorkstreamPanel } from "@/components/evals/remediation-workstream-panel";
import { AnalyzeImpactButton } from "@/components/impact/analyze-impact-button";
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
  const recentAnalyses = useQuery(
    api.impactAnalyses.listForAnchor,
    activeWorkspaceId && workstream
      ? {
          workspaceId: activeWorkspaceId,
          anchorType: "workstream",
          anchorId: workstreamId,
          limit: 5,
        }
      : "skip",
  );
  const workstreamLessons = useQuery(
    api.lessons.listByWorkstream,
    activeWorkspaceId && workstream
      ? { workspaceId: activeWorkspaceId, workstreamId: id }
      : "skip",
  );
  const suggestedPlaybooks = useQuery(
    api.playbooks.suggestForGoal,
    activeWorkspaceId && workstream
      ? { workspaceId: activeWorkspaceId, goal: workstream.title }
      : "skip",
  );

  const eventList = (events ?? []) as TimelineEvent[];
  const replayEvents = useMemo(
    () => filterReplayEvents(eventList, showRawEvents),
    [eventList, showRawEvents],
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
        <div className="workstream-detail-header__links">
          {activeWorkspaceId ? (
            <AnalyzeImpactButton
              workspaceId={activeWorkspaceId}
              anchor={{
                type: "workstream",
                workstreamId: ws.id,
                title: ws.title,
              }}
              projectId={ws.projectId}
              className="workstream-detail-page__ask-link"
            />
          ) : null}
          <Link
            href={`/ask?workstreamId=${ws.id}`}
            className="workstream-detail-page__ask-link"
          >
            Ask about this replay
          </Link>
        </div>
      </header>

      {activeWorkspaceId ? (
        <WorkstreamAgentContextPanel
          workspaceId={activeWorkspaceId}
          workstreamId={ws.id}
          workstreamTitle={ws.title}
          projectId={ws.projectId}
        />
      ) : null}

      {activeWorkspaceId ? (
        <>
          <WorkstreamPrivateEvalsPanel workspaceId={activeWorkspaceId} workstreamId={ws.id} />
          <RemediationWorkstreamPanel workstreamId={ws.id} />
        </>
      ) : null}

      {recentAnalyses && recentAnalyses.length > 0 ? (
        <section className="workstream-impact-section">
          <h2 className="entity-section__title">Recent Impact Analyses</h2>
          <ul>
            {recentAnalyses.map((analysis) => (
              <li key={analysis.id}>
                <Link href={`/impact/${analysis.id}`}>{analysis.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {workstreamLessons && workstreamLessons.length > 0 ? (
        <section className="workstream-impact-section">
          <h2 className="entity-section__title">Lessons</h2>
          <ul>
            {workstreamLessons.map((lesson) => (
              <li key={lesson.id}>
                <Link href={`/lessons/${lesson.id}`}>{lesson.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {suggestedPlaybooks && suggestedPlaybooks.length > 0 ? (
        <section className="workstream-impact-section">
          <h2 className="entity-section__title">Relevant Playbooks</h2>
          <ul>
            {suggestedPlaybooks.map((playbook) => (
              <li key={playbook.id}>
                <Link href={`/playbooks/${playbook.id}`}>{playbook.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
