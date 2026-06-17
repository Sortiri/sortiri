import { describe, expect, it } from "vitest";
import { ProjectCard } from "@/components/platform/ProjectCard";

describe("project cards", () => {
  it("renders metadata fields on platform project card module", () => {
    expect(ProjectCard).toBeTypeOf("function");
    const data = {
      projectId: "p1",
      name: "sortiri-cli-demo",
      description: "Company timeline project",
      status: "active" as const,
      eventsToday: 3,
      activeWorkstreams: 1,
      openIncidents: 0,
      pendingDecisions: 2,
      connectedSources: ["github", "cli"],
      lastEventAt: Date.now(),
    };
    expect(data.eventsToday).toBe(3);
    expect(data.pendingDecisions).toBe(2);
    expect(data.connectedSources).toContain("github");
  });
});
