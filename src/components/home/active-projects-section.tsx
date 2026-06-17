"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ProjectCard } from "@/components/platform";
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
        <div className="home-projects-grid">
          {projectList.map((project) => (
            <ProjectCard
              key={project.projectId}
              project={{
                projectId: project.projectId,
                name: project.name,
                eventsToday: project.eventsToday,
                activeWorkstreams: project.activeWorkstreams,
                openIncidents: project.openIncidents,
                connectedSources: project.connectedSources,
                lastEventAt: project.lastEventAt,
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
