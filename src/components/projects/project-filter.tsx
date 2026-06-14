"use client";

import type { ProjectRecord } from "@/types/projects";
import "./projects.css";

type ProjectFilterProps = {
  projects: ProjectRecord[];
  value: string | null;
  onChange: (projectId: string | null) => void;
};

export function ProjectFilter({ projects, value, onChange }: ProjectFilterProps) {
  return (
    <div className="project-filter">
      <label className="project-filter__label" htmlFor="project-filter-select">
        Project
      </label>
      <select
        id="project-filter-select"
        className="project-filter__select"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">All Projects</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  );
}
