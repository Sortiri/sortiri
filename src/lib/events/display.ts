import type { TimelineEvent } from "@/types/events";

export type TimelineViewMode = "primary" | "raw";

export function getVisibilityLabel(event: TimelineEvent): string | null {
  if (event.isUserPinned || event.importance === "high" || event.importance === "critical") {
    return "HIGH";
  }
  if (event.visibility === "debug") {
    return "DEBUG";
  }
  if (event.importance === "low") {
    return "LOW";
  }
  return null;
}

export function getImportanceLabel(event: TimelineEvent): string | null {
  if (!event.importance) return null;
  return event.importance.toUpperCase();
}

export function shouldShowInPrimaryFeed(event: TimelineEvent): boolean {
  if (event.isUserHidden || event.visibility === "hidden") return false;
  if (event.isUserPinned) return true;
  return event.visibility === "primary" || event.visibility === undefined;
}

export function getEventMutedState(event: TimelineEvent): boolean {
  return event.visibility === "debug" && !event.isUserPinned;
}

export function filterReplayEvents(
  events: TimelineEvent[],
  showRaw: boolean,
): TimelineEvent[] {
  if (showRaw) return events;
  return events.filter((event) => event.type !== "command.started");
}
