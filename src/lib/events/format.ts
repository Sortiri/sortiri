import type { TimelineEvent } from "@/types/events";

export function formatEventTime(occurredAt: number): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(occurredAt));
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatEventDay(occurredAt: number): string {
  const date = new Date(occurredAt);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export type EventDayGroup = {
  label: string;
  events: TimelineEvent[];
};

export function groupEventsByDay(events: TimelineEvent[]): EventDayGroup[] {
  const groups: EventDayGroup[] = [];

  for (const event of events) {
    const label = formatEventDay(event.occurredAt);
    const last = groups[groups.length - 1];
    if (last?.label === label) {
      last.events.push(event);
    } else {
      groups.push({ label, events: [event] });
    }
  }

  return groups;
}
