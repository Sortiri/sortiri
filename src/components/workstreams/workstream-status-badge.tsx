import type { WorkstreamStatus } from "@/types/events";
import { getStatusLabel } from "@/lib/workstreams/labels";

type WorkstreamStatusBadgeProps = {
  status: WorkstreamStatus;
};

export function WorkstreamStatusBadge({ status }: WorkstreamStatusBadgeProps) {
  return (
    <span className={`workstream-status-badge workstream-status-badge--${status}`}>
      {getStatusLabel(status)}
    </span>
  );
}
