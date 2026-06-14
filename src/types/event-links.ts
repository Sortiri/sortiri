import type { EventCategory, EventSource, TimelineEvent } from "@/types/events";

export type EventLinkType =
  | "same_workstream"
  | "same_entity"
  | "same_file"
  | "same_pr"
  | "same_actor"
  | "temporal"
  | "caused_by"
  | "led_to"
  | "related"
  | "manual";

export type EventLinkCreatedBy = "system" | "agent" | "human";

export type ConfidenceLabel = "Strong" | "Likely" | "Possible";

export type EventLinkRecord = {
  id: string;
  workspaceId: string;
  fromEventId?: string;
  toEventId?: string;
  fromWorkstreamId?: string;
  toWorkstreamId?: string;
  type: EventLinkType;
  confidence: number;
  reason: string;
  createdBy: EventLinkCreatedBy;
  metadata?: unknown;
  createdAt: number;
};

export type RelatedHistoryDirection = "before" | "after";

export type RelatedHistoryEvent = {
  id: string;
  title: string;
  type: string;
  category: EventCategory;
  source: EventSource;
  occurredAt: number;
  workstreamId?: string;
};

export type RelatedHistoryItem = {
  link: EventLinkRecord;
  direction: RelatedHistoryDirection;
  relatedEvent?: RelatedHistoryEvent;
};

export type WorkstreamRelatedGroup = {
  label: string;
  items: RelatedHistoryItem[];
};

export type WorkstreamRelatedHistory = {
  groups: WorkstreamRelatedGroup[];
};

export type GenerateLinksResult = {
  created: number;
  skipped: number;
};

export function toRelatedHistoryEvent(event: TimelineEvent): RelatedHistoryEvent {
  return {
    id: event.id,
    title: event.title,
    type: event.type,
    category: event.category,
    source: event.source,
    occurredAt: event.occurredAt,
    workstreamId: event.workstreamId,
  };
}
