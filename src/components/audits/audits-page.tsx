"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { AuditReportCard } from "@/components/audits/audit-report-card";
import { CreateAuditReportModal } from "@/components/audits/create-audit-report-modal";
import {
  PlatformEmptyState,
  PlatformGrid,
  PlatformPage,
  PlatformPageActions,
  PlatformPageHeader,
  PlatformSection,
  PlatformSectionHeader,
} from "@/components/platform";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import type { AuditReportRecord } from "@/types/audit-reports";
import { PageLoader } from "@/components/ui/page-loader";
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

  const grouped = useMemo(() => {
    return {
      draft: reportList.filter((r) => r.status === "draft"),
      finalized: reportList.filter((r) => r.status === "finalized"),
      archived: reportList.filter((r) => r.status === "archived"),
    };
  }, [reportList]);

  return (
    <PlatformPage className="audits-page">
      <PlatformPageHeader
        title="Audits"
        subtitle="Curated evidence rooms for external reviewers, compliance workflows, incidents, and security reviews."
        actions={
          canManage && activeWorkspaceId ? (
            <PlatformPageActions
              secondary={[{ label: "Evidence Review", href: "/security/evidence" }]}
              primary={{ label: "New report", onClick: () => setShowCreate(true) }}
            />
          ) : undefined
        }
      />

      {loading ? <PageLoader variant="inline" /> : null}

      {!loading && reportList.length === 0 ? (
        <PlatformEmptyState
          title="No audit reports yet"
          body="Create an evidence room from your company timeline. Include decisions, incidents, PRs, artifacts, evals, and redacted proof."
          actions={
            canManage
              ? [
                  { label: "New report", onClick: () => setShowCreate(true) },
                  { label: "Review evidence", href: "/security/evidence" },
                ]
              : [{ label: "Review evidence", href: "/security/evidence" }]
          }
        />
      ) : null}

      {!loading && reportList.length > 0 ? (
        <>
          {grouped.draft.length > 0 ? (
            <PlatformSection>
              <PlatformSectionHeader title="Draft reports" />
              <PlatformGrid columns={2}>
                {grouped.draft.map((report) => (
                  <AuditReportCard key={report.id} report={report} />
                ))}
              </PlatformGrid>
            </PlatformSection>
          ) : null}

          {grouped.finalized.length > 0 ? (
            <PlatformSection>
              <PlatformSectionHeader title="Finalized reports" />
              <PlatformGrid columns={2}>
                {grouped.finalized.map((report) => (
                  <AuditReportCard key={report.id} report={report} />
                ))}
              </PlatformGrid>
            </PlatformSection>
          ) : null}

          {grouped.archived.length > 0 ? (
            <PlatformSection>
              <PlatformSectionHeader title="Shared reports" />
              <PlatformGrid columns={2}>
                {grouped.archived.map((report) => (
                  <AuditReportCard key={report.id} report={report} />
                ))}
              </PlatformGrid>
            </PlatformSection>
          ) : null}

          {grouped.draft.length === 0 &&
          grouped.finalized.length === 0 &&
          grouped.archived.length === 0 ? (
            <PlatformSection>
              <PlatformSectionHeader title="Audit reports" />
              <PlatformGrid columns={2}>
                {reportList.map((report) => (
                  <AuditReportCard key={report.id} report={report} />
                ))}
              </PlatformGrid>
            </PlatformSection>
          ) : null}

          <PlatformSection>
            <PlatformSectionHeader
              title="Evidence requiring review"
              description="Review unsafe or unredacted evidence before sharing externally."
              actions={
                <Link href="/security/evidence" className="object-action-bar__secondary">
                  Open evidence review
                </Link>
              }
            />
          </PlatformSection>
        </>
      ) : null}

      {showCreate && activeWorkspaceId ? (
        <CreateAuditReportModal
          workspaceId={activeWorkspaceId}
          onClose={() => setShowCreate(false)}
          onCreated={(reportId) => router.push(`/audits/${reportId}`)}
        />
      ) : null}
    </PlatformPage>
  );
}
