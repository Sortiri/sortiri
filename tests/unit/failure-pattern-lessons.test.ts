import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventRecord } from "../../convex/lib/eventsLib";
import type { Id } from "../../convex/_generated/dataModel";

const listEventsInRange = vi.fn();

vi.mock("../../convex/lib/impactData", () => ({
  listEventsInRange: (...args: unknown[]) => listEventsInRange(...args),
}));

import {
  detectFailurePatterns,
  generateLessonsFromFailurePatterns,
} from "../../convex/lib/failurePatterns";
import { assertLessonCopy } from "../../convex/lib/lessonCopy";

function makeEvent(type: string, id: string): EventRecord {
  return {
    id: id as EventRecord["id"],
    workspaceId: "ws1" as EventRecord["workspaceId"],
    source: "cli",
    category: "system_event",
    type,
    actor: { type: "system", name: "Sortiri" },
    title: `Event ${id}`,
    occurredAt: Date.now(),
    createdAt: Date.now(),
  } as EventRecord;
}

describe("failure pattern lessons", () => {
  beforeEach(() => {
    listEventsInRange.mockReset();
  });

  it("does not emit patterns below the default threshold of 3", async () => {
    listEventsInRange.mockResolvedValue([
      makeEvent("command.failed", "e1"),
      makeEvent("command.failed", "e2"),
    ]);

    const patterns = await detectFailurePatterns({ db: {} as never }, "ws1" as Id<"workspaces">);
    expect(patterns).toHaveLength(0);
  });

  it("emits patterns when failures meet the threshold", async () => {
    listEventsInRange.mockResolvedValue([
      makeEvent("command.failed", "e1"),
      makeEvent("command.failed", "e2"),
      makeEvent("command.failed", "e3"),
    ]);

    const patterns = await detectFailurePatterns({ db: {} as never }, "ws1" as Id<"workspaces">);
    expect(patterns).toHaveLength(1);
    expect(patterns[0]?.failureType).toBe("command.failed");
    expect(patterns[0]?.count).toBe(3);
  });

  it("respects custom threshold overrides", async () => {
    listEventsInRange.mockResolvedValue([
      makeEvent("build.failed", "b1"),
      makeEvent("build.failed", "b2"),
    ]);

    const patterns = await detectFailurePatterns(
      { db: {} as never },
      "ws1" as Id<"workspaces">,
      { threshold: 2 },
    );
    expect(patterns).toHaveLength(1);
    expect(patterns[0]?.failureType).toBe("build.failed");
  });

  it("generates cautious validation lessons from detected patterns", async () => {
    listEventsInRange.mockResolvedValue([
      makeEvent("command.failed", "e1"),
      makeEvent("command.failed", "e2"),
      makeEvent("command.failed", "e3"),
      makeEvent("command.failed", "e4"),
    ]);

    const lessons = await generateLessonsFromFailurePatterns(
      { db: {} as never },
      "ws1" as Id<"workspaces">,
    );

    expect(lessons).toHaveLength(1);
    expect(lessons[0]?.type).toBe("validation");
    expect(lessons[0]?.source).toBe("failure_pattern");
    expect(assertLessonCopy(lessons[0]!.summary)).toBe(true);
    expect(lessons[0]?.tags).toContain("failure-pattern:command.failed");
  });
});
