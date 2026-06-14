import type { ProjectRecord } from "@/types/projects";

export function formatProjectLastActivity(timestamp?: number): string {
  if (!timestamp) return "no activity yet";
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

export function formatProjectMeta(project: ProjectRecord, activeWorkstreams = 0): string {
  const parts: string[] = [];
  const count = project.eventCount ?? 0;
  parts.push(`${count} event${count === 1 ? "" : "s"}`);
  parts.push(
    `${activeWorkstreams} active workstream${activeWorkstreams === 1 ? "" : "s"}`,
  );
  parts.push(`last seen ${formatProjectLastActivity(project.lastEventAt)}`);
  return parts.join(" · ");
}

export function getProjectHref(projectId: string): string {
  return `/projects/${projectId}`;
}
