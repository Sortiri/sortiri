import { formatEventTime } from "@/lib/events/format";

export function formatWorkstreamTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

export function formatReplayTime(occurredAt: number): string {
  return formatEventTime(occurredAt);
}

export function formatWorkstreamDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

export function getCreatedByLabel(
  createdBy?: { type: "agent" | "human" | "system"; name?: string; id?: string },
): string {
  if (!createdBy) return "Unknown";
  if (createdBy.name) return createdBy.name;
  switch (createdBy.type) {
    case "agent":
      return "Agent";
    case "human":
      return "Human";
    case "system":
      return "System";
    default:
      return "Unknown";
  }
}

export function truncateWorkstreamTitle(title: string, maxLength = 28): string {
  if (title.length <= maxLength) return title;
  return `${title.slice(0, maxLength - 1)}…`;
}
