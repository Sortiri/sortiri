import { describe, expect, it } from "vitest";

const EMPTY_STATE_COPY = {
  projects: {
    title: "Create your first project",
    body: "Projects are where Sortiri groups agent work, code changes, decisions, incidents, and outcomes.",
  },
  timeline: {
    title: "No company history recorded yet",
  },
  decisions: {
    title: "No decisions recorded yet",
  },
  incidents: {
    title: "No incidents recorded yet",
  },
} as const;

describe("empty states copy", () => {
  it("projects empty state mentions grouping work", () => {
    expect(EMPTY_STATE_COPY.projects.body).toContain("Projects are where");
  });

  it("timeline empty state mentions install path", () => {
    expect(EMPTY_STATE_COPY.timeline.title.toLowerCase()).toContain("no");
  });

  it("decisions and incidents empty states exist", () => {
    expect(EMPTY_STATE_COPY.decisions.title).toContain("decisions");
    expect(EMPTY_STATE_COPY.incidents.title).toContain("incidents");
  });
});
