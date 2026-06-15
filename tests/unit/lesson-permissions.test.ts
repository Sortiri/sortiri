import { describe, expect, it } from "vitest";
import { canViewEvent, canViewWorkstream } from "../../convex/lib/authz";
import type { Id } from "../../convex/_generated/dataModel";
import type { LessonInput } from "../../convex/lib/lessonsLib";

function filterLessonEvidenceLike(
  lesson: LessonInput,
  accessible: Set<Id<"projects">> | "all",
  events: Map<string, { projectId?: Id<"projects"> }>,
  workstreams: Map<string, { projectId?: Id<"projects"> }>,
  artifacts: Map<string, { redactionStatus?: string; safeForAudit?: boolean }>,
): LessonInput {
  const evidenceEventIds: Id<"events">[] = [];
  for (const eventId of lesson.evidenceEventIds ?? []) {
    const event = events.get(eventId);
    if (event && canViewEvent({ projectId: event.projectId }, accessible)) {
      evidenceEventIds.push(eventId);
    }
  }

  const evidenceWorkstreamIds: Id<"workstreams">[] = [];
  for (const wsId of lesson.evidenceWorkstreamIds ?? []) {
    const ws = workstreams.get(wsId);
    if (ws && canViewWorkstream({ projectId: ws.projectId }, accessible)) {
      evidenceWorkstreamIds.push(wsId);
    }
  }

  const evidenceArtifactIds: Id<"artifacts">[] = [];
  for (const artifactId of lesson.evidenceArtifactIds ?? []) {
    const artifact = artifacts.get(artifactId);
    if (
      artifact &&
      artifact.redactionStatus !== "blocked" &&
      artifact.safeForAudit !== false
    ) {
      evidenceArtifactIds.push(artifactId);
    }
  }

  return {
    ...lesson,
    evidenceEventIds: evidenceEventIds.length > 0 ? evidenceEventIds : undefined,
    evidenceWorkstreamIds:
      evidenceWorkstreamIds.length > 0 ? evidenceWorkstreamIds : undefined,
    evidenceArtifactIds:
      evidenceArtifactIds.length > 0 ? evidenceArtifactIds : undefined,
  };
}

describe("lesson permissions", () => {
  const accessible = new Set<Id<"projects">>(["proj_a" as Id<"projects">]);

  it("keeps evidence events from accessible projects only", () => {
    const lesson: LessonInput = {
      workspaceId: "ws1" as Id<"workspaces">,
      title: "Test lesson",
      summary: "Summary may relate to accessible evidence only.",
      type: "validation",
      status: "active",
      confidence: "possible",
      importance: "normal",
      source: "manual",
      evidenceEventIds: ["evt_a", "evt_b"] as Id<"events">[],
    };
    const events = new Map([
      ["evt_a", { projectId: "proj_a" as Id<"projects"> }],
      ["evt_b", { projectId: "proj_b" as Id<"projects"> }],
    ]);

    const filtered = filterLessonEvidenceLike(lesson, accessible, events, new Map(), new Map());
    expect(filtered.evidenceEventIds).toEqual(["evt_a"]);
  });

  it("filters workstream evidence by project access", () => {
    const lesson: LessonInput = {
      workspaceId: "ws1" as Id<"workspaces">,
      title: "Workstream lesson",
      summary: "Workstream evidence may be scoped to accessible projects.",
      type: "process_learning",
      status: "active",
      confidence: "possible",
      importance: "normal",
      source: "manual",
      evidenceWorkstreamIds: ["ws_a", "ws_b"] as Id<"workstreams">[],
    };
    const workstreams = new Map([
      ["ws_a", { projectId: "proj_a" as Id<"projects"> }],
      ["ws_b", { projectId: "proj_b" as Id<"projects"> }],
    ]);

    const filtered = filterLessonEvidenceLike(
      lesson,
      accessible,
      new Map(),
      workstreams,
      new Map(),
    );
    expect(filtered.evidenceWorkstreamIds).toEqual(["ws_a"]);
  });

  it("drops blocked or unsafe artifacts from evidence", () => {
    const lesson: LessonInput = {
      workspaceId: "ws1" as Id<"workspaces">,
      title: "Security lesson",
      summary: "Only safe artifacts may remain attached to lessons.",
      type: "security_learning",
      status: "active",
      confidence: "likely",
      importance: "high",
      source: "impact_analysis",
      evidenceArtifactIds: ["art_safe", "art_blocked", "art_unsafe"] as Id<"artifacts">[],
    };
    const artifacts = new Map([
      ["art_safe", { redactionStatus: "clean", safeForAudit: true }],
      ["art_blocked", { redactionStatus: "blocked", safeForAudit: true }],
      ["art_unsafe", { redactionStatus: "clean", safeForAudit: false }],
    ]);

    const filtered = filterLessonEvidenceLike(
      lesson,
      accessible,
      new Map(),
      new Map(),
      artifacts,
    );
    expect(filtered.evidenceArtifactIds).toEqual(["art_safe"]);
  });
});
