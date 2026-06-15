import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type {
  ShareableEntityExport,
  ShareableEventExport,
  ShareableInsightExport,
  ShareableReportExportInput,
  ShareableWorkstreamExport,
} from "../../src/types/audit-sharing";
import type { AuditReportItemRecord } from "../../src/types/audit-reports";
import { docToEntity } from "./entitiesLib";
import { docToEvent } from "./eventsLib";
import { docToInsightFinding } from "./insightRunsLib";
import {
  docToAuditReportItem,
  isIdInReportSnapshot,
} from "./auditReportsLib";
import { isArtifactSafeForAudit, isEventSafeForAudit } from "./sensitiveContent";

type DbReadCtx = Pick<QueryCtx, "db">;

export function assertReportSafeForShare(report: Doc<"auditReports">): void {
  if (report.status === "archived") {
    throw new Error("Archived reports cannot be shared");
  }
  if (report.status !== "finalized") {
    throw new Error("Only finalized reports can be shared");
  }
}

export async function assertReportHasNoUnsafeExposedEvidence(
  ctx: DbReadCtx,
  reportId: Id<"auditReports">,
): Promise<void> {
  const items = await ctx.db
    .query("auditReportItems")
    .withIndex("by_report", (q) => q.eq("reportId", reportId))
    .collect();

  for (const item of items) {
    if (item.artifactId) {
      const artifact = await ctx.db.get(item.artifactId);
      if (artifact && !isArtifactSafeForAudit(artifact)) {
        throw new Error(
          "Report includes unsafe exposed evidence and cannot be shared until resolved",
        );
      }
    }
    if (item.eventId) {
      const event = await ctx.db.get(item.eventId);
      if (event && !isEventSafeForAudit(docToEvent(event))) {
        throw new Error(
          "Report includes unsafe exposed evidence and cannot be shared until resolved",
        );
      }
    }
  }
}

function toShareableEvent(doc: Doc<"events">): ShareableEventExport {
  const event = docToEvent(doc);
  return {
    id: event.id,
    title: event.title,
    summary: event.summary,
    type: event.type,
    category: event.category,
    source: event.source,
    occurredAt: event.occurredAt,
    sensitivity: event.sensitivity,
    redactionStatus: event.redactionStatus,
    safeForAudit: event.safeForAudit,
  };
}

function toShareableWorkstream(doc: Doc<"workstreams">): ShareableWorkstreamExport {
  return {
    id: doc._id,
    title: doc.title,
    summary: doc.summary,
    status: doc.status,
    createdAt: doc.createdAt,
  };
}

function toShareableEntity(doc: Doc<"entities">): ShareableEntityExport {
  const entity = docToEntity(doc);
  return {
    id: entity.id,
    type: entity.type,
    key: entity.key,
    name: entity.name,
    summary: undefined,
  };
}

function toShareableInsight(doc: Doc<"insightFindings">): ShareableInsightExport {
  const finding = docToInsightFinding(doc);
  return {
    id: finding.id,
    title: finding.title,
    summary: finding.summary,
    severity: finding.severity,
    findingType: finding.type,
  };
}

function getSafeArtifactContent(doc: Doc<"artifacts">): string | undefined {
  if (!isArtifactSafeForAudit(doc)) {
    return undefined;
  }
  return doc.content;
}

export async function buildShareableReportPayload(
  ctx: DbReadCtx,
  reportId: Id<"auditReports">,
  workspaceExternalId: string,
): Promise<ShareableReportExportInput | null> {
  const report = await ctx.db.get(reportId);
  if (!report || report.status !== "finalized") {
    return null;
  }

  const itemDocs = await ctx.db
    .query("auditReportItems")
    .withIndex("by_report", (q) => q.eq("reportId", reportId))
    .collect();

  let runtimeExcludedCount = 0;
  let redactedEvidenceCount = 0;
  const safeItems: AuditReportItemRecord[] = [];

  const eventMap = new Map<string, ShareableEventExport>();
  const workstreamMap = new Map<string, ShareableWorkstreamExport>();
  const artifactMap = new Map<string, ShareableReportExportInput["evidence"]["artifacts"][number]>();
  const entityMap = new Map<string, ShareableEntityExport>();
  const insightMap = new Map<string, ShareableInsightExport>();

  for (const item of itemDocs) {
    if (item.itemType === "artifact" && item.artifactId) {
      const artifact = await ctx.db.get(item.artifactId);
      if (!artifact || !isArtifactSafeForAudit(artifact)) {
        runtimeExcludedCount += 1;
        continue;
      }
      if (
        artifact.redactionStatus === "redacted" ||
        artifact.redactionStatus === "needs_review"
      ) {
        redactedEvidenceCount += 1;
      }
      artifactMap.set(String(artifact._id), {
        id: String(artifact._id),
        type: artifact.type,
        title: artifact.title,
        summary: artifact.summary,
        content: getSafeArtifactContent(artifact),
        language: artifact.language,
        filePath: artifact.filePath,
        sensitivity: artifact.sensitivity,
        redactionStatus: artifact.redactionStatus,
        safeForAudit: artifact.safeForAudit,
        sensitiveFindings: artifact.sensitiveFindings,
        createdAt: artifact.createdAt,
      });
    }

    if (item.itemType === "event" && item.eventId) {
      const eventDoc = await ctx.db.get(item.eventId);
      if (!eventDoc || !isEventSafeForAudit(docToEvent(eventDoc))) {
        runtimeExcludedCount += 1;
        continue;
      }
      if (
        eventDoc.redactionStatus === "redacted" ||
        eventDoc.redactionStatus === "needs_review"
      ) {
        redactedEvidenceCount += 1;
      }
      eventMap.set(String(eventDoc._id), toShareableEvent(eventDoc));
    }

    if (item.itemType === "workstream" && item.workstreamId) {
      const ws = await ctx.db.get(item.workstreamId);
      if (!ws || !isIdInReportSnapshot(report, "workstream", String(ws._id))) {
        runtimeExcludedCount += 1;
        continue;
      }
      workstreamMap.set(String(ws._id), toShareableWorkstream(ws));
    }

    if (item.itemType === "entity" && item.entityId) {
      const entity = await ctx.db.get(item.entityId);
      if (!entity || !isIdInReportSnapshot(report, "entity", String(entity._id))) {
        runtimeExcludedCount += 1;
        continue;
      }
      entityMap.set(String(entity._id), toShareableEntity(entity));
    }

    if (item.itemType === "insight" && item.insightFindingId) {
      const finding = await ctx.db.get(item.insightFindingId);
      if (!finding) {
        runtimeExcludedCount += 1;
        continue;
      }
      insightMap.set(String(finding._id), toShareableInsight(finding));
    }

    safeItems.push(docToAuditReportItem(item, workspaceExternalId));
  }

  const safetySummary = report.safetySummary;
  const blockedEvidenceCount = safetySummary?.blocked ?? 0;
  const excludedSensitiveEvidenceCount =
    (safetySummary?.excludedArtifacts ?? 0) +
    (safetySummary?.excludedEvents ?? 0) +
    runtimeExcludedCount;

  return {
    report: {
      id: String(report._id),
      title: report.title,
      status: report.status,
      finalizedAt: report.finalizedAt,
      generatedSummary: report.generatedSummary,
      scope: {
        projectIds: report.scope.projectIds?.map(String),
        viewId: report.scope.viewId ? String(report.scope.viewId) : undefined,
        entityIds: report.scope.entityIds?.map(String),
        windowStart: report.scope.windowStart,
        windowEnd: report.scope.windowEnd,
        categories: report.scope.categories,
        sources: report.scope.sources,
        visibility: report.scope.visibility,
      },
      safetySummary: report.safetySummary,
    },
    items: safeItems.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    evidence: {
      events: Array.from(eventMap.values()),
      workstreams: Array.from(workstreamMap.values()),
      artifacts: Array.from(artifactMap.values()),
      entities: Array.from(entityMap.values()),
      insights: Array.from(insightMap.values()),
    },
    safety: {
      excludedSensitiveEvidenceCount,
      redactedEvidenceCount,
      blockedEvidenceCount,
      runtimeExcludedCount,
    },
  };
}

export function formatScopeSummary(scope: ShareableReportExportInput["report"]["scope"]): string {
  const parts: string[] = [];
  if (scope.projectIds?.length) {
    parts.push(`${scope.projectIds.length} project(s)`);
  }
  if (scope.viewId) {
    parts.push("saved view");
  }
  if (scope.entityIds?.length) {
    parts.push(`${scope.entityIds.length} entity filter(s)`);
  }
  if (scope.windowStart || scope.windowEnd) {
    parts.push("time window");
  }
  if (scope.categories?.length) {
    parts.push(`${scope.categories.length} category filter(s)`);
  }
  if (scope.sources?.length) {
    parts.push(`${scope.sources.length} source filter(s)`);
  }
  if (scope.visibility) {
    parts.push(`visibility: ${scope.visibility}`);
  }
  return parts.length > 0 ? parts.join(", ") : "Full workspace scope";
}
