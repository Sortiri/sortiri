import type { WorkstreamStatus } from "@/types/events";

export const STATUS_LABELS: Record<WorkstreamStatus, string> = {
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

export type WorkstreamFilterValue = WorkstreamStatus | null;

export const FILTER_TABS: { label: string; value: WorkstreamFilterValue }[] = [
  { label: "All", value: null },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
];

export function getStatusLabel(status: WorkstreamStatus): string {
  return STATUS_LABELS[status];
}
