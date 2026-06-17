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
import { WorkstreamDecisionsPanel } from "@/components/decisions/workstream-decisions-panel";
import { WorkstreamIncidentsPanel } from "@/components/incidents/workstream-incidents-panel";
import { WorkstreamStatusBadge } from "@/components/workstreams/workstream-status-badge";
import { ObjectHeader, ObjectMetaRow, ObjectTabs, useObjectTab } from "@/components/platform";
import { PageLoader } from "@/components/ui/page-loader";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { filterReplayEvents } from "@/lib/events/display";
import {
  formatWorkstreamDateTime,
  getCreatedByLabel,
} from "@/lib/workstreams/format";
import type { TimelineEvent, Workstream } from "@/types/events";
import "./workstreams.css";

const WORKSTREAM_TABS = [
  { id: "replay", label: "Replay" },
  { id: "events", label: "Events" },
  { id: "artifacts", label: "Artifacts" },
  { id: "decisions", label: "Decisions" },
  { id: "incidents", label: "Incidents" },
  { id: "evals", label: "Evals" },
  { id: "impact", label: "Impact" },
  { id: "context", label: "Context" },
] as const;

type WorkstreamTab = (typeof WORKSTREAM_TABS)[number]["id"];
const VALID_WORKSTREAM_TABS = WORKSTREAM_TABS.map((tab) => tab.id);

type WorkstreamDetailPageProps = {
  workstreamId: string;
};

export function WorkstreamDetailPage({ workstreamId }: WorkstreamDetailPageProps) {
  const { activeWorkspaceId } = useWorkspace();
  const searchParams = useSearchParams();
  const focusEventId = searchParams.get("eventId");
  const activeTab = useObjectTab(VALID_WORKSTREAM_TABS, "replay");
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
  const replayEvents = useMemo(() => filterReplayEvents(eventList, false), [eventList]);
  const tabEvents = useMemo(
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
        <PageLoader variant="inline" />
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
  const basePath = `/workstreams/${ws.id}`;

  const metaItems = [
    { label: "Created by", value: createdBy },
    { label: "Started", value: started },
    ...(ended ? [{ label: "Ended", value: ended }] : []),
  ];

  return (
    <div className="workstream-detail-page">
      <ObjectHeader
        backHref="/workstreams"
        backLabel="Workstreams"
        title={ws.title}
        description={ws.summary ?? undefined}
        badges={<WorkstreamStatusBadge status={ws.status} />}
        actions={
          <>
            {activeWorkspaceId ? (
              <PinReplayButton workspaceId={activeWorkspaceId} workstreamId={ws.id} />
            ) : null}
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
            <Link href={`/ask?workstreamId=${ws.id}`} className="workstream-detail-page__ask-link">
              Ask about this replay
            </Link>
          </>
        }
        meta={<ObjectMetaRow items={metaItems} />}
      />

      <ObjectTabs
        tabs={[...WORKSTREAM_TABS]}
        activeTab={activeTab}
        defaultTab="replay"
        basePath={basePath}
        ariaLabel="Workstream sections"
      />

      {activeTab === "replay" ? (
        <section className="object-section">
          {relatedGroups && relatedGroups.length > 0 ? (
            <WorkstreamRelatedHistorySection groups={relatedGroups} />
          ) : null}
          {events === undefined ? (
            <PageLoader variant="section" />
          ) : (
            <ReplayTimeline events={replayEvents} focusEventId={focusEventId} />
          )}
        </section>
      ) : null}

      {activeTab === "events" ? (
        <section className="object-section">
          <label className="workstream-raw-toggle">
            <input
              type="checkbox"
              checked={showRawEvents}
              onChange={(event) => setShowRawEvents(event.target.checked)}
            />
            Show raw events
          </label>
          {events === undefined ? (
            <PageLoader variant="section" />
          ) : (
            <ReplayTimeline events={tabEvents} focusEventId={focusEventId} />
          )}
        </section>
      ) : null}

      {activeTab === "artifacts" ? (
        <section className="object-section">
          <WorkstreamArtifactsSection workstreamId={ws.id} />
        </section>
      ) : null}

      {activeTab === "decisions" && activeWorkspaceId ? (
        <section className="object-section">
          <WorkstreamDecisionsPanel workspaceId={activeWorkspaceId} workstreamId={ws.id} />
        </section>
      ) : null}

      {activeTab === "incidents" && activeWorkspaceId ? (
        <section className="object-section">
          <WorkstreamIncidentsPanel workspaceId={activeWorkspaceId} workstreamId={ws.id} />
        </section>
      ) : null}

      {activeTab === "evals" && activeWorkspaceId ? (
        <section className="object-section">
          <WorkstreamPrivateEvalsPanel workspaceId={activeWorkspaceId} workstreamId={ws.id} />
          <RemediationWorkstreamPanel workstreamId={ws.id} />
        </section>
      ) : null}

      {activeTab === "impact" ? (
        <section className="object-section">
          {recentAnalyses && recentAnalyses.length > 0 ? (
            <div className="workstream-impact-section">
              <h2 className="object-section__title">Recent Impact Analyses</h2>
              <ul>
                {recentAnalyses.map((analysis) => (
                  <li key={analysis.id}>
                    <Link href={`/impact/${analysis.id}`}>{analysis.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="object-section__body">No impact analyses for this workstream yet.</p>
          )}
          {workstreamLessons && workstreamLessons.length > 0 ? (
            <div className="workstream-impact-section">
              <h2 className="object-section__title">Lessons</h2>
              <ul>
                {workstreamLessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link href={`/lessons/${lesson.id}`}>{lesson.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {suggestedPlaybooks && suggestedPlaybooks.length > 0 ? (
            <div className="workstream-impact-section">
              <h2 className="object-section__title">Relevant Playbooks</h2>
              <ul>
                {suggestedPlaybooks.map((playbook) => (
                  <li key={playbook.id}>
                    <Link href={`/playbooks/${playbook.id}`}>{playbook.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "context" && activeWorkspaceId ? (
        <section className="object-section">
          <WorkstreamAgentContextPanel
            workspaceId={activeWorkspaceId}
            workstreamId={ws.id}
            workstreamTitle={ws.title}
            projectId={ws.projectId}
          />
        </section>
      ) : null}
    </div>
  );
}
