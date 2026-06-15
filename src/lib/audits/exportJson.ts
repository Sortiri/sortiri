import type { AuditEvidenceManifest, ShareableReportExportInput } from "@/types/audit-sharing";

export function exportJson(payload: ShareableReportExportInput): AuditEvidenceManifest {
  return {
    report: {
      id: payload.report.id,
      title: payload.report.title,
      status: payload.report.status,
      finalizedAt: payload.report.finalizedAt,
      generatedSummary: payload.report.generatedSummary,
      scope: payload.report.scope,
    },
    evidence: {
      events: payload.evidence.events,
      workstreams: payload.evidence.workstreams,
      artifacts: payload.evidence.artifacts,
      entities: payload.evidence.entities,
      insights: payload.evidence.insights,
    },
    safety: {
      excludedSensitiveEvidenceCount: payload.safety.excludedSensitiveEvidenceCount,
      redactedEvidenceCount: payload.safety.redactedEvidenceCount,
      blockedEvidenceCount: payload.safety.blockedEvidenceCount,
    },
    exportedAt: payload.exportedAt ?? Date.now(),
  };
}

export function exportJsonString(payload: ShareableReportExportInput): string {
  return JSON.stringify(exportJson(payload), null, 2);
}
