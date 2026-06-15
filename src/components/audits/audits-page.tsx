"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { AuditReportCard } from "@/components/audits/audit-report-card";
import { CreateAuditReportModal } from "@/components/audits/create-audit-report-modal";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import type { AuditReportRecord } from "@/types/audit-reports";
import "./audits.css";

export function AuditsPage() {
  const router = useRouter();
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canManage = capabilities?.canManageAuditReports ?? false;
  const [showCreate, setShowCreate] = useState(false);

  const reports = useQuery(
    api.auditReports.listByWorkspace,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip",
  );

  const loading = wsLoading || (activeWorkspaceId !== null && reports === undefined);
  const reportList = (reports ?? []) as AuditReportRecord[];

  return (
    <div className="audits-page">
      <header className="audits-page__header-row">
        <div>
          <h1 className="audits-page__title">Audits</h1>
          <p className="audits-page__subtitle">
            Curated evidence packages for external reviewers and compliance workflows.
          </p>
        </div>
        {canManage && activeWorkspaceId ? (
          <div className="audits-page__header-actions">
            <Link href="/security/evidence" className="audits-page__create-action">
              Evidence Review
            </Link>
            <button
              type="button"
              className="audits-page__create-action"
              onClick={() => setShowCreate(true)}
            >
              New report
            </button>
          </div>
        ) : null}
      </header>

      {loading ? <p className="audits-page__subtitle">Loading audit reports…</p> : null}

      {!loading && reportList.length === 0 ? (
        <p className="audits-page__subtitle">
          {canManage
            ? "No audit reports yet. Create a draft to collect evidence."
            : "No audit reports have been shared with you yet."}
        </p>
      ) : null}

      <div className="audits-grid">
        {reportList.map((report) => (
          <AuditReportCard key={report.id} report={report} />
        ))}
      </div>

      {showCreate && activeWorkspaceId ? (
        <CreateAuditReportModal
          workspaceId={activeWorkspaceId}
          onClose={() => setShowCreate(false)}
          onCreated={(reportId) => router.push(`/audits/${reportId}`)}
        />
      ) : null}
    </div>
  );
}
