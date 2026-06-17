import { describe, expect, it } from "vitest";
import { SEED_EVENTS } from "../../scripts/demo-open-source-local";

describe("oss demo script", () => {
  it("defines seeded event types for launch demo", () => {
    const types = SEED_EVENTS.map((e) => e.type);
    expect(types).toContain("agent.action");
    expect(types).toContain("decision.recorded");
    expect(types).toContain("command.run");
    expect(types).toContain("incident.opened");
    expect(types).toContain("rollback.recorded");
    expect(types).toContain("validation.passed");
    expect(types).toContain("command.failed");
    expect(types).toContain("code.changed");
  });
});
