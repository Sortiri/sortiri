"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  formatEventTime,
} from "@/lib/events/format";
import {
  getActorLabel,
  getCategoryLabel,
  getEventTypeLabel,
  getRevenueSummary,
  getSourceLabel,
} from "@/lib/events/labels";
import {
  formatCommandMetaLine,
  getCommandMeta,
  isCommandFailureEvent,
} from "@/lib/events/commandMeta";
import { getEventMutedState, getVisibilityLabel } from "@/lib/events/display";
import { lookupResolvedEntityId, EntityLink } from "@/components/entities/entity-link";
import { ProjectLink } from "@/components/projects/project-link";
import type { TimelineEvent } from "@/types/events";
import { ArtifactPreview } from "@/components/artifacts/artifact-preview";
import { RelatedHistoryPanel } from "@/components/links/related-history-panel";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { getTimelineEventDomId } from "@/lib/links/navigation";
import { EvidenceSafetyBadges } from "@/components/security/evidence-safety-badges";
import { AnalyzeImpactButton } from "@/components/impact/analyze-impact-button";
import { isImpactAnchorEligible } from "@/lib/impact/eligibility";
import { redactionStatusLabel } from "@/types/evidence-safety";

function formatStripeRevenueMeta(data: Record<string, unknown> | undefined): string {
  if (!data) return "Stripe revenue event";
  const parts: string[] = [];
  const amount =
    typeof data.amount === "number"
      ? data.amount
      : typeof data.amountTotal === "number"
        ? data.amountTotal
        : typeof data.amountPaid === "number"
          ? data.amountPaid
          : typeof data.amountRefunded === "number"
            ? data.amountRefunded
            : undefined;
  const currency = typeof data.currency === "string" ? data.currency.toUpperCase() : undefined;
  if (amount !== undefined) {
    parts.push(`${amount.toFixed(2)} ${currency ?? "USD"}`);
  }
  if (typeof data.customerEmail === "string") {
    parts.push(`Customer: ${data.customerEmail}`);
  } else if (typeof data.customerId === "string") {
    parts.push(`Customer: ${data.customerId}`);
  }
  if (typeof data.subscriptionId === "string") {
    parts.push(`Subscription: ${data.subscriptionId}`);
  } else if (typeof data.paymentIntentId === "string") {
    parts.push(`Payment: ${data.paymentIntentId}`);
  } else if (typeof data.sessionId === "string") {
    parts.push(`Checkout: ${data.sessionId}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Stripe revenue event";
}

type TimelineEventCardProps = {
  event: TimelineEvent;
  relatedCount?: number;
  focused?: boolean;
  entityResolveMap?: Record<string, string | null>;
  workspaceId?: string | null;
};

export function TimelineEventCard({
  event,
  relatedCount = 0,
  focused = false,
  entityResolveMap,
  workspaceId = null,
}: TimelineEventCardProps) {
  const { capabilities } = useWorkspaceMembership(workspaceId);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const markImportant = useMutation(api.events.markImportant);
  const hideEvent = useMutation(api.events.hide);
  const restoreEvent = useMutation(api.events.restore);

  const actor = getActorLabel(event.actor);
  const source = getSourceLabel(event.source);
  const time = formatEventTime(event.occurredAt);
  const typeLabel = getEventTypeLabel(event.type);
  const visibilityLabel = getVisibilityLabel(event);
  const muted = getEventMutedState(event);
  const summary =
    event.category === "revenue_event"
      ? getRevenueSummary(
          event.data as Record<string, unknown> | undefined,
          event.summary,
        )
      : event.summary;
  const commandMeta = getCommandMeta(event);
  const commandMetaLine = commandMeta ? formatCommandMetaLine(commandMeta) : null;
  const isError = isCommandFailureEvent(event);
  const entityKey = event.entity?.id ?? event.entity?.name;
  const resolvedEntityId =
    event.entity && entityKey
      ? lookupResolvedEntityId(entityResolveMap, event.entity.type, entityKey)
      : null;

  const runAction = async (action: "important" | "hide" | "restore") => {
    setActionError(null);
    setActing(true);
    try {
      const eventId = event.id as Id<"events">;
      if (action === "important") {
        await markImportant({ eventId });
      } else if (action === "hide") {
        await hideEvent({ eventId });
      } else {
        await restoreEvent({ eventId });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActing(false);
    }
  };

  return (
    <article
      id={getTimelineEventDomId(event.id)}
      className={`timeline-event-card${focused ? " timeline-event-card--focused" : ""}${isError ? " timeline-event-card--error" : ""}${muted ? " timeline-event-card--muted" : ""}`}
    >
      <div className="timeline-event-card__header">
        <div className="timeline-event-card__labels">
          <p className="timeline-event-card__category">{getCategoryLabel(event.category)}</p>
          {typeLabel ? (
            <p className="timeline-event-card__type">{typeLabel}</p>
          ) : null}
          {visibilityLabel ? (
            <span
              className={`timeline-event-card__badge timeline-event-card__badge--${visibilityLabel.toLowerCase()}`}
            >
              {visibilityLabel}
            </span>
          ) : null}
          {event.sensitivity && event.sensitivity !== "internal" ? (
            <EvidenceSafetyBadges item={event} />
          ) : redactionStatusLabel(event.redactionStatus) ? (
            <EvidenceSafetyBadges item={event} />
          ) : null}
        </div>
        <div className="timeline-event-card__actions">
          {canWrite && !event.isUserPinned ? (
            <button
              type="button"
              className="timeline-event-card__action"
              disabled={acting}
              onClick={() => void runAction("important")}
            >
              Mark important
            </button>
          ) : null}
          {canWrite && !event.isUserHidden ? (
            <button
              type="button"
              className="timeline-event-card__action"
              disabled={acting}
              onClick={() => void runAction("hide")}
            >
              Hide
            </button>
          ) : null}
          {canWrite && (event.isUserPinned || event.isUserHidden) ? (
            <button
              type="button"
              className="timeline-event-card__action"
              disabled={acting}
              onClick={() => void runAction("restore")}
            >
              Restore
            </button>
          ) : null}
          {workspaceId && isImpactAnchorEligible(event) ? (
            <AnalyzeImpactButton
              workspaceId={workspaceId}
              anchor={{
                type: "event",
                eventId: event.id,
                title: event.title,
                occurredAt: event.occurredAt,
              }}
              projectId={event.projectId}
              className="timeline-event-card__action"
              label="Analyze Impact"
            />
          ) : null}
        </div>
      </div>
      <h3 className="timeline-event-card__title">{event.title}</h3>
      {event.entity ? (
        <EntityLink
          entity={event.entity}
          entityId={resolvedEntityId}
          label={event.entity.name ?? event.entity.id}
        />
      ) : null}
      {event.projectId ? (
        <p className="timeline-event-card__project-link">
          <span className="entity-link__label">Project</span>
          <ProjectLink projectId={event.projectId} />
        </p>
      ) : null}
      {summary ? (
        <p className="timeline-event-card__summary">{summary}</p>
      ) : null}
      {commandMetaLine ? (
        <p className="timeline-event-card__command-meta">{commandMetaLine}</p>
      ) : null}
      {event.source === "stripe" && event.category === "revenue_event" ? (
        <p className="timeline-event-card__command-meta">
          {formatStripeRevenueMeta(event.data as Record<string, unknown> | undefined)}
        </p>
      ) : null}
      <p className="timeline-event-card__meta">
        {actor} · {source} · {time}
      </p>
      {actionError ? <p className="timeline-event-card__action-error">{actionError}</p> : null}
      {event.artifactIds && event.artifactIds.length > 0 ? (
        <ArtifactPreview artifactIds={event.artifactIds} />
      ) : null}
      {event.source === "github" && event.entity?.url ? (
        <p className="timeline-event-card__external-link">
          <a href={event.entity.url} target="_blank" rel="noreferrer">
            Open in GitHub
          </a>
        </p>
      ) : null}
      {event.source === "stripe" && event.entity?.url ? (
        <p className="timeline-event-card__external-link">
          <a href={event.entity.url} target="_blank" rel="noreferrer">
            Open in Stripe
          </a>
        </p>
      ) : null}
      {event.workstreamId ? (
        <p className="timeline-event-card__replay-link">
          <Link href={`/workstreams/${event.workstreamId}`}>View Replay</Link>
        </p>
      ) : null}
      {relatedCount > 0 ? (
        <RelatedHistoryPanel eventId={event.id} relatedCount={relatedCount} />
      ) : null}
    </article>
  );
}
