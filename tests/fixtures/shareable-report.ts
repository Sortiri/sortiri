import type { ShareableReportExportInput } from "@/types/audit-sharing";

export function createShareableFixture(
  overrides?: Partial<ShareableReportExportInput>,
): ShareableReportExportInput {
  return {
    report: {
      id: "report_1",
      title: "Q1 Security Audit",
      status: "finalized",
      finalizedAt: Date.parse("2026-01-15T12:00:00.000Z"),
      generatedSummary: "This report covers primary timeline events for Q1.",
      scope: { projectIds: ["proj_1"], visibility: "primary" },
      safetySummary: {
        includedItems: 3,
        excludedArtifacts: 1,
        excludedEvents: 0,
        needsReview: 1,
        blocked: 1,
      },
    },
    items: [
      {
        id: "item_event",
        workspaceId: "ws_1",
        reportId: "report_1",
        itemType: "event",
        eventId: "evt_1",
        title: "Deploy completed",
        summary: "Production deploy succeeded.",
        reason: "Matched scope.",
        order: 0,
        createdAt: 1,
      },
      {
        id: "item_artifact_safe",
        workspaceId: "ws_1",
        reportId: "report_1",
        itemType: "artifact",
        artifactId: "art_safe",
        title: "Safe log",
        reason: "Attached to included event.",
        order: 1,
        createdAt: 1,
      },
      {
        id: "item_artifact_redacted",
        workspaceId: "ws_1",
        reportId: "report_1",
        itemType: "artifact",
        artifactId: "art_redacted",
        title: "Redacted config",
        reason: "Included with redactions.",
        order: 2,
        createdAt: 1,
      },
    ],
    evidence: {
      events: [
        {
          id: "evt_1",
          title: "Deploy completed",
          summary: "Production deploy succeeded.",
          type: "deploy.completed",
          category: "engineering",
          source: "github",
          occurredAt: Date.parse("2026-01-10T10:00:00.000Z"),
          safeForAudit: true,
        },
      ],
      workstreams: [],
      artifacts: [
        {
          id: "art_safe",
          type: "log",
          title: "Safe log",
          content: "INFO service started",
          safeForAudit: true,
          redactionStatus: "none",
          createdAt: 1,
        },
        {
          id: "art_redacted",
          type: "log",
          title: "Redacted config",
          content: "API_KEY=[REDACTED: SECRET]",
          safeForAudit: true,
          redactionStatus: "redacted",
          sensitivity: "confidential",
          createdAt: 1,
        },
      ],
      entities: [],
      insights: [],
    },
    safety: {
      excludedSensitiveEvidenceCount: 1,
      redactedEvidenceCount: 1,
      blockedEvidenceCount: 1,
      runtimeExcludedCount: 0,
    },
    ...overrides,
  };
}

export function createFixtureWithBlockedArtifact(): ShareableReportExportInput {
  const base = createShareableFixture();
  return {
    ...base,
    items: [
      ...base.items,
      {
        id: "item_blocked",
        workspaceId: "ws_1",
        reportId: "report_1",
        itemType: "artifact",
        artifactId: "art_blocked",
        title: "Blocked secret",
        order: 3,
        createdAt: 1,
      },
    ],
    evidence: {
      ...base.evidence,
      artifacts: [
        ...base.evidence.artifacts,
        {
          id: "art_blocked",
          type: "log",
          title: "Blocked secret",
          content: "password=secret",
          safeForAudit: false,
          redactionStatus: "blocked",
          createdAt: 1,
        },
      ],
    },
  };
}
