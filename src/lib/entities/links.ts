import type { EntityRecord } from "@/types/entities";
import type { EntityType, EventEntity, TimelineEvent } from "@/types/events";

export function getEntityHref(entityId: string): string {
  return `/entities/${entityId}`;
}

export function getDefaultAskQuestion(entity: EntityRecord): string {
  switch (entity.type) {
    case "customer":
      return `What happened with customer ${entity.name}?`;
    case "user":
      return `What happened with user ${entity.name}?`;
    case "file":
      return `What happened with ${entity.name}?`;
    case "pull_request":
      return `What happened around ${entity.name}?`;
    case "source":
      return `What happened from ${entity.name}?`;
    case "actor":
      return `What did ${entity.name} do?`;
    default:
      return `What happened with ${entity.name}?`;
  }
}

export function getAskEntityHref(entity: EntityRecord): string {
  const q = encodeURIComponent(getDefaultAskQuestion(entity));
  return `/ask?entityId=${entity.id}&q=${q}`;
}

export function getEntityResolveKey(type: EntityType, key: string): string {
  const normalizedKey =
    type === "source" ? key.trim().toLowerCase() : key.trim().replace(/\\/g, "/");
  return `${type}:${normalizedKey}`;
}

export function getEntityCandidatesFromEvent(event: TimelineEvent): Array<{ type: EntityType; key: string }> {
  const candidates: Array<{ type: EntityType; key: string }> = [];

  if (event.entity) {
    const key = event.entity.id ?? event.entity.name;
    if (key) {
      candidates.push({ type: event.entity.type, key });
    }
  }

  const actorKey = event.actor.id ?? event.actor.email ?? event.actor.name;
  if (actorKey) {
    candidates.push({ type: "actor", key: actorKey });
  }

  if (event.source) {
    candidates.push({ type: "source", key: event.source });
  }

  return candidates;
}

export function getEntityTimelineLinkLabel(type: EntityType): string {
  switch (type) {
    case "file":
      return "View file timeline";
    case "customer":
      return "View customer timeline";
    case "user":
      return "View user timeline";
    case "pull_request":
      return "View PR timeline";
    case "payment":
      return "View payment timeline";
    case "source":
      return "View source timeline";
    default:
      return "View entity timeline";
  }
}

export function getPrimaryEntityFromEvent(event: TimelineEvent): EventEntity | null {
  if (event.entity?.name || event.entity?.id) {
    return event.entity;
  }
  return null;
}
