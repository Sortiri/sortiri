import type { EntityType } from "./events";

export type EntityRecord = {
  id: string;
  workspaceId: string;
  type: EntityType;
  key: string;
  name: string;
  url?: string;
  source?: string;
  eventCount: number;
  workstreamCount?: number;
  firstSeenAt: number;
  lastSeenAt: number;
  metadata?: unknown;
  createdAt: number;
  updatedAt: number;
};

export type EntityFilterType = EntityType | null;

export type EntityResolveCandidate = {
  type: EntityType;
  key: string;
};

export type EntityTimelineResult = {
  entity: EntityRecord;
  events: import("./events").TimelineEvent[];
};
