import type { AuditReportItemRecord } from "@/types/audit-reports";
import type { ShareableReportExportInput } from "@/types/audit-sharing";
import { EXPORT_SAFETY_NOTICE } from "@/types/audit-sharing";

function formatDate(ms?: number): string {
  if (!ms) return "—";
  return new Date(ms).toISOString();
}

function redactionNotice(
  redactionStatus?: string,
  sensitivity?: string,
): string | null {
  if (redactionStatus === "redacted") {
    return "Content was redacted before inclusion in this report.";
  }
  if (redactionStatus === "needs_review") {
    return "Content was reviewed and included with redactions.";
  }
  if (sensitivity && sensitivity !== "public" && sensitivity !== "internal") {
    return `Sensitivity: ${sensitivity}`;
  }
  return null;
}

function formatItemSection(
  item: AuditReportItemRecord,
  payload: ShareableReportExportInput,
): string | null {
  const lines: string[] = [];

  if (item.itemType === "event" && item.eventId) {
    const event = payload.evidence.events.find((row) => row.id === item.eventId);
    if (!event) return null;
    lines.push(`### Event: ${item.title || event.title}`);
    lines.push("");
    lines.push(`Time: ${formatDate(event.occurredAt)}`);
    lines.push(`Source: ${event.source}`);
    lines.push(`Category: ${event.category}`);
    if (item.reason) lines.push(`Reason included: ${item.reason}`);
    lines.push("");
    if (item.summary || event.summary) {
      lines.push("Summary:");
      lines.push(item.summary || event.summary || "");
      lines.push("");
    }
    const notice = redactionNotice(event.redactionStatus, event.sensitivity);
    if (notice) lines.push(`> ${notice}`);
    return lines.join("\n");
  }

  if (item.itemType === "artifact" && item.artifactId) {
    const artifact = payload.evidence.artifacts.find((row) => row.id === item.artifactId);
    if (!artifact) return null;
    lines.push(`### Artifact: ${item.title || artifact.title}`);
    lines.push("");
    if (artifact.sensitivity) lines.push(`Sensitivity: ${artifact.sensitivity}`);
    if (artifact.redactionStatus) lines.push(`Redaction status: ${artifact.redactionStatus}`);
    if (item.reason) lines.push(`Reason included: ${item.reason}`);
    lines.push("");
    const notice = redactionNotice(artifact.redactionStatus, artifact.sensitivity);
    if (notice) lines.push(`> ${notice}`);
    if (artifact.content) {
      lines.push("");
      lines.push("Content:");
      lines.push("");
      lines.push("```txt");
      lines.push(artifact.content);
      lines.push("```");
    }
    return lines.join("\n");
  }

  if (item.itemType === "workstream" && item.workstreamId) {
    const ws = payload.evidence.workstreams.find((row) => row.id === item.workstreamId);
    if (!ws) return null;
    lines.push(`### Workstream: ${item.title || ws.title}`);
    lines.push("");
    if (item.reason) lines.push(`Reason included: ${item.reason}`);
    if (item.summary || ws.summary) {
      lines.push("");
      lines.push("Summary:");
      lines.push(item.summary || ws.summary || "");
    }
    return lines.join("\n");
  }

  if (item.itemType === "entity" && item.entityId) {
    const entity = payload.evidence.entities.find((row) => row.id === item.entityId);
    if (!entity) return null;
    lines.push(`### Entity: ${item.title || entity.name || entity.key}`);
    lines.push("");
    lines.push(`Type: ${entity.type}`);
    lines.push(`Key: ${entity.key}`);
    if (item.reason) lines.push(`Reason included: ${item.reason}`);
    return lines.join("\n");
  }

  if (item.itemType === "insight" && item.insightFindingId) {
    const insight = payload.evidence.insights.find((row) => row.id === item.insightFindingId);
    if (!insight) return null;
    lines.push(`### Insight: ${item.title || insight.title}`);
    lines.push("");
    lines.push(`Severity: ${insight.severity}`);
    lines.push(`Type: ${insight.findingType}`);
    if (item.reason) lines.push(`Reason included: ${item.reason}`);
    if (item.summary || insight.summary) {
      lines.push("");
      lines.push(insight.summary || item.summary || "");
    }
    return lines.join("\n");
  }

  if (item.itemType === "note") {
    lines.push(`### Note: ${item.title}`);
    lines.push("");
    if (item.summary) lines.push(item.summary);
    if (item.reason) lines.push(`Reason: ${item.reason}`);
    return lines.join("\n");
  }

  return null;
}

function formatScopeSummary(scope: ShareableReportExportInput["report"]["scope"]): string {
  const parts: string[] = [];
  if (scope.projectIds?.length) parts.push(`${scope.projectIds.length} project(s)`);
  if (scope.viewId) parts.push("saved view");
  if (scope.windowStart || scope.windowEnd) parts.push("time window");
  if (scope.visibility) parts.push(`visibility: ${scope.visibility}`);
  return parts.length > 0 ? parts.join(", ") : "Full workspace scope";
}

export function exportMarkdown(payload: ShareableReportExportInput): string {
  const { report, evidence, safety } = payload;
  const lines: string[] = [];

  lines.push(`# Audit Report: ${report.title}`);
  lines.push("");
  lines.push(`Status: Finalized`);
  lines.push(`Finalized At: ${formatDate(report.finalizedAt)}`);
  lines.push(`Scope: ${formatScopeSummary(report.scope)}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(report.generatedSummary || report.title);
  lines.push("");
  lines.push("## Evidence Overview");
  lines.push("");
  lines.push(`- Events: ${evidence.events.length}`);
  lines.push(`- Workstreams: ${evidence.workstreams.length}`);
  lines.push(`- Artifacts: ${evidence.artifacts.length}`);
  lines.push(`- Entities: ${evidence.entities.length}`);
  lines.push(`- Insights: ${evidence.insights.length}`);
  lines.push(`- Redacted Evidence: ${safety.redactedEvidenceCount}`);
  lines.push(`- Excluded Sensitive Evidence: ${safety.excludedSensitiveEvidenceCount}`);
  lines.push(`- Blocked Evidence: ${safety.blockedEvidenceCount}`);
  lines.push("");
  lines.push("## Evidence");
  lines.push("");

  for (const item of payload.items) {
    const section = formatItemSection(item, payload);
    if (section) {
      lines.push(section);
      lines.push("");
    }
  }

  lines.push("---");
  lines.push("");
  lines.push(`> ${EXPORT_SAFETY_NOTICE}`);
  lines.push("");
  lines.push(`Exported at: ${formatDate(payload.exportedAt ?? Date.now())}`);

  return lines.join("\n");
}
