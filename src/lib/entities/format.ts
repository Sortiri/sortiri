import type { EntityType } from "@/types/events";
import type { EntityRecord } from "@/types/entities";

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  file: "File",
  user: "User",
  customer: "Customer",
  feature: "Feature",
  project: "Project",
  workspace: "Workspace",
  pull_request: "Pull Request",
  issue: "Issue",
  payment: "Payment",
  subscription: "Subscription",
  command: "Command",
  source: "Source",
  actor: "Actor",
  other: "Other",
};

export function getEntityTypeLabel(type: EntityType): string {
  return ENTITY_TYPE_LABELS[type] ?? type;
}

export function formatEntityLastSeen(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

export function formatEntityDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

export type EntityFilterOption = {
  label: string;
  value: EntityType | null;
};

export const ENTITY_FILTER_OPTIONS: EntityFilterOption[] = [
  { label: "All", value: null },
  { label: "Customers", value: "customer" },
  { label: "Users", value: "user" },
  { label: "Files", value: "file" },
  { label: "Pull Requests", value: "pull_request" },
  { label: "Issues", value: "issue" },
  { label: "Payments", value: "payment" },
  { label: "Actors", value: "actor" },
  { label: "Sources", value: "source" },
  { label: "Projects", value: "project" },
  { label: "Commands", value: "command" },
];

export const DEBUG_ENTITY_TYPES: EntityType[] = ["command"];

export function isPrimaryEntityType(type: EntityType): boolean {
  return !DEBUG_ENTITY_TYPES.includes(type);
}

export function formatEntityMeta(entity: EntityRecord): string {
  const parts = [`${entity.eventCount} event${entity.eventCount === 1 ? "" : "s"}`];
  parts.push(`last seen ${formatEntityLastSeen(entity.lastSeenAt)}`);
  if (entity.source) parts.push(entity.source);
  return parts.join(" · ");
}
