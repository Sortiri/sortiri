import type { EventCategory, EventSource } from "@/types/events";

export type SavedViewType =
  | "engineering"
  | "product"
  | "revenue"
  | "growth"
  | "support"
  | "executive"
  | "custom";

export type SavedViewSharing = "workspace" | "private";

export type SavedViewFilters = {
  projectIds?: string[];
  categories?: EventCategory[];
  sources?: EventSource[];
  entityTypes?: string[];
  entityIds?: string[];
  actorTypes?: string[];
  importance?: Array<"low" | "normal" | "high" | "critical">;
  visibility?: "primary" | "debug" | "all";
  query?: string;
};

export type SavedViewRecord = {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  type: SavedViewType;
  visibility: SavedViewSharing;
  ownerUserId?: string;
  allowedRoles?: Array<"owner" | "admin" | "member" | "viewer">;
  filters: SavedViewFilters;
  isDefault?: boolean;
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ViewPulseCounts = {
  totalEvents: number;
  agentActions: number;
  codeChanges: number;
  productEvents: number;
  decisions: number;
  revenueEvents: number;
  systemEvents: number;
};

export type PinnedViewSummary = {
  view: SavedViewRecord;
  eventsToday: number;
  summary: string;
};

export function getViewHref(viewId: string): string {
  return `/views/${viewId}`;
}

export function formatViewType(type: SavedViewType): string {
  if (type === "custom") return "Custom";
  return type.charAt(0).toUpperCase() + type.slice(1);
}
