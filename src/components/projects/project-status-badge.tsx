import type { ProjectStatus } from "@/types/projects";

type ProjectStatusBadgeProps = {
  status: ProjectStatus;
};

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  return (
    <span className={`project-status-badge project-status-badge--${status}`}>
      {status}
    </span>
  );
}
