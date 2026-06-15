"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type AuditExportSectionProps = {
  reportId: string;
  canManage: boolean;
  isFinalized: boolean;
};

export function AuditExportSection({
  reportId,
  canManage,
  isFinalized,
}: AuditExportSectionProps) {
  const access = useQuery(api.auditReports.canAccessReport, {
    reportId: reportId as Id<"auditReports">,
  });

  const canExport = canManage || access?.canAccess === true;

  if (!isFinalized || !canExport) {
    return null;
  }

  const base = `/api/audits/${reportId}/export`;

  return (
    <section className="audit-export-section">
      <h2 className="evidence-review-section__title">Export</h2>
      <div className="audit-export-section__actions">
        <a className="audit-detail__action" href={`${base}/markdown`}>
          Download Markdown
        </a>
        <a className="audit-detail__action" href={`${base}/html`}>
          Download HTML
        </a>
        <a className="audit-detail__action" href={`${base}/json`}>
          Download JSON Manifest
        </a>
      </div>
    </section>
  );
}
