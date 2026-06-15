"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AuditAccessSection } from "@/components/audits/audit-access-section";
import { AuditEvidenceSection } from "@/components/audits/audit-evidence-section";
import { AuditExportSection } from "@/components/audits/audit-export-section";
import { AuditShareLinksSection } from "@/components/audits/audit-share-links-section";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import type { AuditReportItemRecord, AuditReportRecord } from "@/types/audit-reports";
import { isReportImmutable } from "@/types/audit-reports";
import "@/components/security/security.css";
import "./audits.css";

type AuditReportDetailPageProps = {
  reportId: string;
};

export function AuditReportDetailPage({ reportId }: AuditReportDetailPageProps) {
  const { activeWorkspaceId } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canManage = capabilities?.canManageAuditReports ?? false;
  const isAuditor = capabilities?.role === "auditor";

  const report = useQuery(api.auditReports.getById, {
    reportId: reportId as Id<"auditReports">,
  });
  const items = useQuery(api.auditReports.listItems, {
    reportId: reportId as Id<"auditReports">,
  });

  const generateEvidence = useMutation(api.auditReports.generateEvidence);
  const finalizeReport = useMutation(api.auditReports.finalize);
  const recordAuditorView = useMutation(api.auditReports.recordAuditorView);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportRecord = report as AuditReportRecord | undefined;
  const itemList = (items ?? []) as AuditReportItemRecord[];
  const immutable = reportRecord ? isReportImmutable(reportRecord.status) : false;

  useEffect(() => {
    if (!isAuditor || !reportRecord) return;
    void recordAuditorView({ reportId: reportId as Id<"auditReports"> });
  }, [isAuditor, recordAuditorView, reportId, reportRecord]);

  const handleGenerate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await generateEvidence({ reportId: reportId as Id<"auditReports"> });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate evidence");
    } finally {
      setBusy(false);
    }
  }, [generateEvidence, reportId]);

  const handleFinalize = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await finalizeReport({ reportId: reportId as Id<"auditReports"> });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finalize report");
    } finally {
      setBusy(false);
    }
  }, [finalizeReport, reportId]);

  if (report === undefined || items === undefined) {
    return <p className="audits-page__subtitle">Loading audit report…</p>;
  }

  if (!reportRecord) {
    return (
      <div>
        <p>Audit report not found.</p>
        <Link href="/audits">← Back to Audits</Link>
      </div>
    );
  }

  return (
    <div className="audit-detail-page">
      <Link href="/audits" className="audit-evidence-item__link">
        ← Back to Audits
      </Link>

      <header>
        <span className={`audit-status audit-status--${reportRecord.status}`}>
          {reportRecord.status}
        </span>
        <h1 className="audits-page__title">{reportRecord.title}</h1>
        {reportRecord.summary ? (
          <p className="audit-detail__summary">{reportRecord.summary}</p>
        ) : null}
        {reportRecord.generatedSummary ? (
          <p className="audit-detail__summary">{reportRecord.generatedSummary}</p>
        ) : null}
      </header>

      {reportRecord.safetySummary ? (
        <section className="audit-safety-summary">
          <h2 className="evidence-review-section__title">Evidence safety summary</h2>
          <div className="audit-safety-summary__grid">
            <div className="audit-safety-summary__stat">
              <strong>{reportRecord.safetySummary.includedItems}</strong>
              Included
            </div>
            <div className="audit-safety-summary__stat">
              <strong>{reportRecord.safetySummary.excludedArtifacts}</strong>
              Excluded artifacts
            </div>
            <div className="audit-safety-summary__stat">
              <strong>{reportRecord.safetySummary.excludedEvents}</strong>
              Excluded events
            </div>
            <div className="audit-safety-summary__stat">
              <strong>{reportRecord.safetySummary.needsReview}</strong>
              Needs review
            </div>
            <div className="audit-safety-summary__stat">
              <strong>{reportRecord.safetySummary.blocked}</strong>
              Blocked
            </div>
          </div>
          {canManage ? (
            <Link href="/security/evidence" className="audit-evidence-item__link">
              Open Evidence Review
            </Link>
          ) : null}
        </section>
      ) : null}

      {(reportRecord.safetySummary?.excludedArtifacts ?? 0) > 0 ||
      (reportRecord.safetySummary?.excludedEvents ?? 0) > 0 ? (
        <p className="audit-safety-summary__banner">
          Some evidence was excluded from this report because it requires review or was blocked.
        </p>
      ) : null}

      {canManage ? (
        <div className="audit-detail__actions">
          <button
            type="button"
            className="audit-detail__action"
            disabled={busy || immutable}
            onClick={() => void handleGenerate()}
          >
            {busy ? "Working…" : "Generate evidence"}
          </button>
          <button
            type="button"
            className="audit-detail__action"
            disabled={busy || immutable || itemList.length === 0}
            onClick={() => void handleFinalize()}
          >
            Finalize report
          </button>
          <Link
            href={`/ask?auditReportId=${reportId}`}
            className="audit-evidence-item__link"
          >
            Ask about this report
          </Link>
        </div>
      ) : (
        <Link
          href={`/ask?auditReportId=${reportId}`}
          className="audit-evidence-item__link"
        >
          Ask about this report
        </Link>
      )}

      {error ? <p className="audit-modal__error">{error}</p> : null}

      <AuditExportSection
        reportId={reportId}
        canManage={canManage}
        isFinalized={reportRecord.status === "finalized"}
      />

      {canManage ? (
        <AuditShareLinksSection
          reportId={reportId}
          isFinalized={reportRecord.status === "finalized"}
        />
      ) : null}

      <AuditEvidenceSection items={itemList} reportId={reportId} />

      {canManage && activeWorkspaceId ? (
        <AuditAccessSection workspaceId={activeWorkspaceId} reportId={reportId} />
      ) : null}
    </div>
  );
}
