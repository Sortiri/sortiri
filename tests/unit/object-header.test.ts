import { describe, expect, it } from "vitest";
import { PROJECT_TABS } from "@/lib/platform/project-tabs";

describe("object header / project tabs", () => {
  it("project tabs include overview and settings", () => {
    const labels = PROJECT_TABS.map((tab) => tab.label);
    expect(labels[0]).toBe("Overview");
    expect(labels).toContain("Timeline");
    expect(labels).toContain("Decisions");
    expect(labels).toContain("Incidents");
    expect(labels).toContain("Settings");
  });

  it("default tab is overview", () => {
    expect(PROJECT_TABS[0]?.id).toBe("overview");
  });
});
