"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatProjectLastActivity } from "@/lib/projects/format";
import { getProjectHref } from "@/lib/projects/format";
import type { ActiveProjectSummary } from "@/types/projects";
import "./home.css";

type ActiveProjectsSectionProps = {
  workspaceId: string;
};

export function ActiveProjectsSection({ workspaceId }: ActiveProjectsSectionProps) {
  const projects = useQuery(api.projects.getActiveProjects, {
    workspaceId,
    limit: 3,
  });

  const projectList = (projects ?? []) as ActiveProjectSummary[];

  return (
    <section className="home-section">
      <div className="home-section__header">
        <h2 className="home-section__title">Active Projects</h2>
        <Link href="/projects" className="home-section__link">
          View Projects
        </Link>
      </div>
      {projectList.length === 0 ? (
        <p className="home-section__empty">
          No projects yet. Run sortiri init in a repo to register your first project.
        </p>
      ) : (
        projectList.map((project) => (
          <article key={project.projectId} className="home-workstream-card">
            <h3 className="home-workstream-card__title">
              <Link href={getProjectHref(project.projectId)}>{project.name}</Link>
            </h3>
            <p className="home-workstream-card__meta">
              {project.eventsToday} event{project.eventsToday === 1 ? "" : "s"} today ·{" "}
              {project.activeWorkstreams} active workstream
              {project.activeWorkstreams === 1 ? "" : "s"}
              {project.lastEventAt
                ? ` · last seen ${formatProjectLastActivity(project.lastEventAt)}`
                : ""}
            </p>
          </article>
        ))
      )}
    </section>
  );
}
