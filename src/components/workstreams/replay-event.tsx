"use client";

import { formatReplayTime } from "@/lib/workstreams/format";
import {
  getActorLabel,
  getCategoryLabel,
  getEventTypeLabel,
  getSourceLabel,
} from "@/lib/events/labels";
import {
  formatCommandMetaLine,
  getCommandMeta,
  isCommandFailureEvent,
} from "@/lib/events/commandMeta";
import { EntityLink, lookupResolvedEntityId } from "@/components/entities/entity-link";
import type { TimelineEvent } from "@/types/events";
import { ArtifactPreview } from "@/components/artifacts/artifact-preview";
import { getTimelineEventDomId } from "@/lib/links/navigation";

type ReplayEventProps = {
  event: TimelineEvent;
  focused?: boolean;
  entityResolveMap?: Record<string, string | null>;
};

export function ReplayEvent({ event, focused = false, entityResolveMap }: ReplayEventProps) {
  const actor = getActorLabel(event.actor);
  const source = getSourceLabel(event.source);
  const time = formatReplayTime(event.occurredAt);
  const typeLabel = getEventTypeLabel(event.type);
  const commandMeta = getCommandMeta(event);
  const commandMetaLine = commandMeta ? formatCommandMetaLine(commandMeta) : null;
  const isError = isCommandFailureEvent(event);
  const entityKey = event.entity?.id ?? event.entity?.name;
  const resolvedEntityId =
    event.entity && entityKey
      ? lookupResolvedEntityId(entityResolveMap, event.entity.type, entityKey)
      : null;

  const metaParts = [getCategoryLabel(event.category), source];
  if (event.entity?.name && !resolvedEntityId) {
    metaParts.push(event.entity.name);
  }

  return (
    <article
      id={getTimelineEventDomId(event.id)}
      className={`replay-event${focused ? " replay-event--focused" : ""}${isError ? " replay-event--error" : ""}`}
    >
      <p className="replay-event__time">{time}</p>
      <div className="replay-event__body">
        <div className="replay-event__labels">
          <p className="replay-event__category">{getCategoryLabel(event.category)}</p>
          {typeLabel ? <p className="replay-event__type">{typeLabel}</p> : null}
        </div>
        <h3 className="replay-event__title">{event.title}</h3>
        {event.entity ? (
          <EntityLink
            entity={event.entity}
            entityId={resolvedEntityId}
            label={event.entity.name ?? event.entity.id}
          />
        ) : null}
        {event.summary ? <p className="replay-event__summary">{event.summary}</p> : null}
        {commandMetaLine ? (
          <p className="replay-event__command-meta">{commandMetaLine}</p>
        ) : null}
        <p className="replay-event__meta">
          {actor} · {metaParts.join(" · ")}
        </p>
        {event.artifactIds && event.artifactIds.length > 0 ? (
          <ArtifactPreview artifactIds={event.artifactIds} compact />
        ) : null}
        {event.source === "github" && event.entity?.url ? (
          <p className="replay-event__external-link">
            <a href={event.entity.url} target="_blank" rel="noreferrer">
              Open in GitHub
            </a>
          </p>
        ) : null}
      </div>
    </article>
  );
}
