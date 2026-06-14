"use client";

import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { EntityCard } from "@/components/entities/entity-card";
import { InsightsFindingCard } from "@/components/insights/insights-finding-card";
import { TimelineEventCard } from "@/components/timeline/timeline-event-card";
import { WorkstreamCard } from "@/components/workstreams/workstream-card";
import { ViewForm } from "@/components/views/view-form";
import { ViewPulse } from "@/components/views/view-pulse";
import { InsightsWindowFilter } from "@/components/insights/insights-window-filter";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import type { EntityRecord } from "@/types/entities";
import type { TimelineEvent, Workstream } from "@/types/events";
import type { InsightFindingDetail, InsightWindow } from "@/types/insights";
import type { SavedViewRecord, ViewPulseCounts } from "@/types/saved-views";
import { formatViewType } from "@/types/saved-views";
import "@/components/home/home.css";
import "@/components/entities/entities.css";
import "./views.css";

type ViewDetailPageProps = {
  viewId: string;
};

export function ViewDetailPage({ viewId }: ViewDetailPageProps) {
  const { activeWorkspaceId } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const [pulseWindow, setPulseWindow] = useState<InsightWindow>("24h");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const id = viewId as Id<"savedViews">;

  const view = useQuery(
    api.savedViews.getById,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId, viewId: id } : "skip",
  );

  const pulse = useQuery(
    api.savedViews.getViewPulse,
    activeWorkspaceId
      ? { workspaceId: activeWorkspaceId, viewId: id, window: pulseWindow }
      : "skip",
  );

  const events = useQuery(
    api.savedViews.applyViewToEvents,
    activeWorkspaceId
      ? { workspaceId: activeWorkspaceId, viewId: id, limit: 30 }
      : "skip",
  );

  const runs = useQuery(
    api.insights.listRuns,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId, limit: 5 } : "skip",
  );

  const latestRun = runs?.find((run) => run.status === "completed") ?? runs?.[0];

  const findings = useQuery(
    api.insights.listFindingsByRun,
    latestRun ? { runId: latestRun.id as Id<"insightRuns"> } : "skip",
  );

  const pinView = useMutation(api.savedViews.pin);
  const unpinView = useMutation(api.savedViews.unpin);
  const updateView = useMutation(api.savedViews.update);
  const deleteView = useMutation(api.savedViews.deleteView);
  const generateRun = useAction(api.insights.generateRun);

  const canEdit =
    view &&
    capabilities &&
    (view.visibility === "private"
      ? capabilities.canCreatePrivateViews
      : capabilities.canManageViews);
  const canPin = capabilities?.canCreatePrivateViews ?? false;

  const scopedFindings = useMemo(() => {
    if (!findings || !events) return [] as InsightFindingDetail[];
    const eventIds = new Set(events.map((event) => event.id));
    return (findings as InsightFindingDetail[]).filter((finding) =>
      (finding.evidenceEventIds ?? []).some((eventId) => eventIds.has(eventId)),
    );
  }, [events, findings]);

  const handlePinToggle = useCallback(async () => {
    if (!activeWorkspaceId || !view) return;
    setBusy(true);
    try {
      if (view.isPinned) {
        await unpinView({ viewId: id });
      } else {
        await pinView({ viewId: id });
      }
    } finally {
      setBusy(false);
    }
  }, [activeWorkspaceId, id, pinView, unpinView, view]);

  const handleDelete = useCallback(async () => {
    if (!view) return;
    setBusy(true);
    try {
      await deleteView({
        viewId: id,
        confirmDefault: view.isDefault ? true : undefined,
      });
      globalThis.location.href = "/views";
    } finally {
      setBusy(false);
    }
  }, [deleteView, id, view]);

  const loading = view === undefined || pulse === undefined || events === undefined;

  if (loading) {
    return (
      <div className="view-detail-page">
        <p className="projects-page__loading">Loading view…</p>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="view-detail-page">
        <Link href="/views" className="view-detail-page__back">
          ← Back to Views
        </Link>
        <p className="home-section__empty">View not found.</p>
      </div>
    );
  }

  const viewRecord = view as SavedViewRecord;
  const pulseData = pulse as {
    counts: ViewPulseCounts;
    recentEvents: TimelineEvent[];
    relatedWorkstreams: Workstream[];
    relatedEntities: EntityRecord[];
  };

  return (
    <div className="view-detail-page">
      <Link href="/views" className="view-detail-page__back">
        ← Back to Views
      </Link>

      <header className="view-detail-header">
        <div className="view-detail-header__row">
          <div>
            <h1 className="view-detail-header__title">{viewRecord.name}</h1>
            <p className="view-detail-header__description">
              {formatViewType(viewRecord.type)} · {viewRecord.visibility}
            </p>
            {viewRecord.description ? (
              <p className="view-detail-header__description">{viewRecord.description}</p>
            ) : null}
          </div>
          <div className="views-page__actions">
            {canEdit ? (
              <button
                type="button"
                className="view-detail-header__action"
                onClick={() => setEditing((value) => !value)}
              >
                {editing ? "Close edit" : "Edit"}
              </button>
            ) : null}
            {canPin ? (
              <button
                type="button"
                className="view-detail-header__action"
                onClick={() => void handlePinToggle()}
                disabled={busy}
              >
                {viewRecord.isPinned ? "Unpin" : "Pin"}
              </button>
            ) : null}
            <Link
              href={`/ask?viewId=${viewRecord.id}`}
              className="view-detail-header__action"
            >
              Ask about this view
            </Link>
            {canEdit ? (
              <button
                type="button"
                className="view-detail-header__action"
                onClick={() => void handleDelete()}
                disabled={busy}
              >
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {editing && canEdit ? (
        <ViewForm
          initialName={viewRecord.name}
          initialDescription={viewRecord.description}
          initialVisibility={viewRecord.visibility}
          initialFilters={viewRecord.filters}
          canCreateWorkspaceView={capabilities?.canManageViews ?? false}
          submitLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            await updateView({
              viewId: id,
              name: values.name,
              description: values.description,
              visibility: values.visibility,
              filters: values.filters as Parameters<typeof updateView>[0]["filters"],
            });
            setEditing(false);
          }}
        />
      ) : null}

      <section className="view-detail-section">
        <div className="view-detail-header__row">
          <h2 className="view-detail-section__title">Pulse</h2>
          <InsightsWindowFilter value={pulseWindow} onChange={setPulseWindow} />
        </div>
        <ViewPulse counts={pulseData.counts} />
      </section>

      <section className="view-detail-section">
        <h2 className="view-detail-section__title">Timeline</h2>
        {(events as TimelineEvent[]).length === 0 ? (
          <p className="home-section__empty">No matching events for this view.</p>
        ) : (
          <div className="home-section__list">
            {(events as TimelineEvent[]).map((event) => (
              <TimelineEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      <section className="view-detail-section">
        <h2 className="view-detail-section__title">Workstreams</h2>
        {pulseData.relatedWorkstreams.length === 0 ? (
          <p className="home-section__empty">No related workstreams.</p>
        ) : (
          <div className="home-section__list">
            {pulseData.relatedWorkstreams.map((workstream) => (
              <WorkstreamCard key={workstream.id} workstream={workstream} />
            ))}
          </div>
        )}
      </section>

      <section className="view-detail-section">
        <h2 className="view-detail-section__title">Entities</h2>
        {pulseData.relatedEntities.length === 0 ? (
          <p className="home-section__empty">No related entities.</p>
        ) : (
          <div className="entities-list">
            {pulseData.relatedEntities.map((entity) => (
              <EntityCard key={entity.id} entity={entity} />
            ))}
          </div>
        )}
      </section>

      <section className="view-detail-section">
        <div className="view-detail-header__row">
          <h2 className="view-detail-section__title">Insights</h2>
          {activeWorkspaceId ? (
            <button
              type="button"
              className="view-detail-header__action"
              onClick={() =>
                void generateRun({
                  workspaceId: activeWorkspaceId,
                  window: "7d",
                  viewId: id,
                })
              }
            >
              Generate insight report for this view
            </button>
          ) : null}
        </div>
        {scopedFindings.length > 0 ? (
          <div className="home-section__list">
            {scopedFindings.map((finding) => (
              <InsightsFindingCard key={finding.id} finding={finding} />
            ))}
          </div>
        ) : (
          <p className="home-section__empty">
            Generate an insight report scoped to this view to see findings here.
          </p>
        )}
      </section>
    </div>
  );
}
