import Link from "next/link";
import { StatusBadge } from "@/components/platform/StatusBadge";
import { SourceBadge } from "@/components/platform/SourceBadge";
import { getProjectHref, formatProjectLastActivity } from "@/lib/projects/format";

export type PlatformProjectCardData = {
  projectId: string;
  name: string;
  description?: string;
  repositoryUrl?: string;
  status?: "active" | "archived" | "paused";
  eventsToday?: number;
  activeWorkstreams?: number;
  openIncidents?: number;
  pendingDecisions?: number;
  connectedSources?: string[];
  lastEventAt?: number;
};

type ProjectCardProps = {
  project: PlatformProjectCardData;
  showActions?: boolean;
};

export function ProjectCard({ project, showActions = true }: ProjectCardProps) {
  const statusTone =
    project.status === "active" ? "success" : project.status === "paused" ? "warning" : "neutral";

  const statsParts: string[] = [];
  if (project.eventsToday !== undefined) {
    statsParts.push(
      `${project.eventsToday} event${project.eventsToday === 1 ? "" : "s"} today`,
    );
  }
  if (project.activeWorkstreams !== undefined) {
    statsParts.push(
      `${project.activeWorkstreams} active workstream${project.activeWorkstreams === 1 ? "" : "s"}`,
    );
  }
  if (project.openIncidents !== undefined && project.openIncidents > 0) {
    statsParts.push(
      `${project.openIncidents} open incident${project.openIncidents === 1 ? "" : "s"}`,
    );
  }
  if (project.pendingDecisions !== undefined && project.pendingDecisions > 0) {
    statsParts.push(
      `${project.pendingDecisions} pending decision${project.pendingDecisions === 1 ? "" : "s"}`,
    );
  }
  if (project.lastEventAt) {
    statsParts.push(`last activity ${formatProjectLastActivity(project.lastEventAt)}`);
  }

  return (
    <article className="platform-project-card-wrap">
      <Link href={getProjectHref(project.projectId)} className="platform-project-card">
        <div className="platform-project-card__header">
          <h3 className="platform-project-card__name">{project.name}</h3>
          {project.status ? <StatusBadge label={project.status} tone={statusTone} /> : null}
        </div>
        {project.description ? (
          <p className="platform-project-card__description">{project.description}</p>
        ) : (
          <p className="platform-project-card__description">Company timeline project</p>
        )}
        {project.repositoryUrl ? (
          <p className="platform-project-card__repo">{project.repositoryUrl}</p>
        ) : null}
        {statsParts.length > 0 ? (
          <p className="platform-project-card__stats-line">{statsParts.join(" · ")}</p>
        ) : null}
        {project.connectedSources && project.connectedSources.length > 0 ? (
          <div className="platform-project-card__sources">
            {project.connectedSources.map((source) => (
              <SourceBadge key={source} source={source} />
            ))}
          </div>
        ) : null}
      </Link>
      {showActions ? (
        <div className="platform-project-card__actions">
          <Link href={getProjectHref(project.projectId)} className="platform-project-card__action">
            Open project
          </Link>
          <Link
            href={`/timeline?projectId=${project.projectId}`}
            className="platform-project-card__action"
          >
            View timeline
          </Link>
          <Link
            href={`/ask?projectId=${project.projectId}`}
            className="platform-project-card__action"
          >
            Ask about project
          </Link>
        </div>
      ) : null}
    </article>
  );
}
