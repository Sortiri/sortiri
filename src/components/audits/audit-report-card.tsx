"use client";

import Link from "next/link";
import type { AuditReportRecord } from "@/types/audit-reports";
import { StatusBadge } from "@/components/platform/StatusBadge";

type AuditReportCardProps = {
  report: AuditReportRecord;
};

function scopeLabel(scope: AuditReportRecord["scope"]): string {
  const parts: string[] = [];
  if (scope.projectIds?.length) {
    parts.push(`${scope.projectIds.length} project${scope.projectIds.length === 1 ? "" : "s"}`);
  }
  if (scope.windowStart && scope.windowEnd) {
    parts.push("time window");
  }
  if (scope.categories?.length) {
    parts.push(`${scope.categories.length} categories`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Full workspace";
}

export function AuditReportCard({ report }: AuditReportCardProps) {
  const statusTone =
    report.status === "finalized" ? "success" : report.status === "draft" ? "warning" : "neutral";

  const safeCount = report.safetySummary
    ? report.safetySummary.includedItems - report.safetySummary.needsReview - report.safetySummary.blocked
    : 0;
  const unsafeCount =
    (report.safetySummary?.needsReview ?? 0) + (report.safetySummary?.blocked ?? 0);

  return (
    <Link href={`/audits/${report.id}`} className="audit-card platform-card">
      <div className="audit-card__header">
        <StatusBadge label={report.status} tone={statusTone} />
        {report.finalizedAt ? (
          <span className="audit-card__share">Finalized</span>
        ) : null}
      </div>
      <h2 className="audit-card__title">{report.title}</h2>
      {report.summary ? <p className="audit-card__meta">{report.summary}</p> : null}
      <p className="audit-card__meta">Scope: {scopeLabel(report.scope)}</p>
      <p className="audit-card__meta">
        {report.itemCount ?? 0} evidence items
        {unsafeCount > 0 ? ` · ${unsafeCount} need review` : ""}
        {safeCount > 0 ? ` · ${safeCount} safe` : ""}
      </p>
      <p className="audit-card__meta">
        Created {new Date(report.createdAt).toLocaleDateString()}
        {report.updatedAt !== report.createdAt
          ? ` · Updated ${new Date(report.updatedAt).toLocaleDateString()}`
          : ""}
      </p>
    </Link>
  );
}
