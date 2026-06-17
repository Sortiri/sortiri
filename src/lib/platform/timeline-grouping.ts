import type { TimelineEvent } from "@/types/events";

export type TimelineRecencyGroup = "Today" | "Yesterday" | "This week" | "Older";

export type TimelineRecencyGroupItem = {
  label: TimelineRecencyGroup;
  events: TimelineEvent[];
};

function startOfUtcDay(date = new Date()): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function getRecencyGroup(timestamp: number, now = Date.now()): TimelineRecencyGroup {
  const todayStart = startOfUtcDay(new Date(now));
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;

  if (timestamp >= todayStart) return "Today";
  if (timestamp >= yesterdayStart) return "Yesterday";
  if (timestamp >= weekStart) return "This week";
  return "Older";
}

export function groupEventsByRecency(
  events: TimelineEvent[],
  now = Date.now(),
): TimelineRecencyGroupItem[] {
  const buckets: Record<TimelineRecencyGroup, TimelineEvent[]> = {
    Today: [],
    Yesterday: [],
    "This week": [],
    Older: [],
  };

  for (const event of events) {
    const ts = event.occurredAt ?? event.createdAt ?? 0;
    buckets[getRecencyGroup(ts, now)].push(event);
  }

  const order: TimelineRecencyGroup[] = ["Today", "Yesterday", "This week", "Older"];
  return order
    .map((label) => ({ label, events: buckets[label] }))
    .filter((group) => group.events.length > 0);
}

export function filterEventsByTimeRange(
  events: TimelineEvent[],
  range: "24h" | "7d" | "30d" | "all",
  now = Date.now(),
): TimelineEvent[] {
  if (range === "all") return events;
  const ms =
    range === "24h"
      ? 24 * 60 * 60 * 1000
      : range === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
  const cutoff = now - ms;
  return events.filter((e) => (e.occurredAt ?? e.createdAt ?? 0) >= cutoff);
}
