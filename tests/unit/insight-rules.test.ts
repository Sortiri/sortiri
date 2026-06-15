import { describe, expect, it } from "vitest";
import { generateDeterministicFindings } from "../../convex/lib/insightRules";
import type { EventRecord } from "../../convex/lib/eventsLib";

function makeEvent(overrides: Partial<EventRecord> & Pick<EventRecord, "type" | "title">): EventRecord {
  return {
    id: crypto.randomUUID() as EventRecord["id"],
    workspaceId: "ws1" as EventRecord["workspaceId"],
    source: "system",
    category: "system_event",
    actor: { type: "system", name: "Sortiri" },
    occurredAt: Date.now(),
    createdAt: Date.now(),
    ...overrides,
  } as EventRecord;
}

describe("insight rules", () => {
  const windowEnd = Date.now();
  const windowStart = windowEnd - 7 * 24 * 60 * 60 * 1000;

  it("emits team access changed finding when member events exist", () => {
    const events = [
      makeEvent({
        type: "workspace.member_invited",
        title: "Invited teammate",
        category: "system_event",
        source: "system",
      }),
    ];
    const findings = generateDeterministicFindings({
      events,
      workstreams: [],
      windowStart,
      windowEnd,
    });
    expect(findings.some((f) => f.title === "Team access changed")).toBe(true);
  });

  it("emits error finding for command failures", () => {
    const events = [
      makeEvent({
        type: "command.failed",
        title: "Test Command Failed",
        category: "system_event",
        source: "cli",
        severity: "error",
      }),
    ];
    const findings = generateDeterministicFindings({
      events,
      workstreams: [],
      windowStart,
      windowEnd,
    });
    expect(findings.some((f) => f.title === "Command failure detected")).toBe(true);
    expect(findings.some((f) => f.type === "error" && f.severity === "warning")).toBe(true);
  });

  it("emits PostHog product activity finding", () => {
    const events = [
      makeEvent({
        type: "posthog.user.signed_up",
        title: "User signed up",
        category: "product_event",
        source: "posthog",
      }),
      makeEvent({
        type: "posthog.feature.used",
        title: "Feature used",
        category: "product_event",
        source: "posthog",
        data: { feature: "timeline" },
      }),
    ];
    const findings = generateDeterministicFindings({
      events,
      workstreams: [],
      windowStart,
      windowEnd,
    });
    expect(findings.some((f) => f.title === "PostHog product activity detected")).toBe(true);
  });

  it("emits impact_opportunity for merged pull requests", () => {
    const events = [
      makeEvent({
        type: "github.pull_request.merged",
        title: "Merged PR",
        category: "code_change",
        source: "github",
      }),
    ];
    const findings = generateDeterministicFindings({
      events,
      workstreams: [],
      windowStart,
      windowEnd,
    });
    expect(findings.some((f) => f.type === "impact_opportunity")).toBe(true);
  });

  it("emits lesson_opportunity when impact analysis was generated", () => {
    const events = [
      makeEvent({
        type: "impact_analysis.generated",
        title: "Impact analysis ready",
        category: "system_event",
        source: "system",
        entity: { type: "other", id: "ia1", name: "Deploy impact" },
      }),
    ];
    const findings = generateDeterministicFindings({
      events,
      workstreams: [],
      windowStart,
      windowEnd,
    });
    const lessonOpportunity = findings.find((f) => f.type === "lesson_opportunity");
    expect(lessonOpportunity?.title).toBe("Generate lessons from impact analysis");
    expect(lessonOpportunity?.data).toMatchObject({
      cta: "generate_lesson",
      impactAnalysisId: "ia1",
    });
  });

  it("emits lesson_opportunity after repeated command failures", () => {
    const events = Array.from({ length: 3 }, (_, index) =>
      makeEvent({
        type: "command.failed",
        title: `Command failed ${index + 1}`,
        category: "system_event",
        source: "cli",
        severity: "error",
      }),
    );
    const findings = generateDeterministicFindings({
      events,
      workstreams: [],
      windowStart,
      windowEnd,
    });
    const lessonOpportunity = findings.find(
      (f) => f.type === "lesson_opportunity" && f.title === "Repeated command failures",
    );
    expect(lessonOpportunity).toBeDefined();
    expect(lessonOpportunity?.data).toMatchObject({ cta: "generate_failure_lesson" });
  });

  it("emits lesson_opportunity after repeated webhook failures", () => {
    const events = Array.from({ length: 3 }, (_, index) =>
      makeEvent({
        type: "stripe.webhook.signature_failed",
        title: `Webhook failure ${index + 1}`,
        category: "system_event",
        source: "stripe",
        severity: "warning",
      }),
    );
    const findings = generateDeterministicFindings({
      events,
      workstreams: [],
      windowStart,
      windowEnd,
    });
    const lessonOpportunity = findings.find(
      (f) => f.type === "lesson_opportunity" && f.title === "Webhook validation failures",
    );
    expect(lessonOpportunity).toBeDefined();
    expect(lessonOpportunity?.severity).toBe("warning");
  });
});
