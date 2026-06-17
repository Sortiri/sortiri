"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SharedAuditReportViewer } from "@/components/audits/SharedAuditReportViewer";
import { PageLoader } from "@/components/ui/page-loader";

type SharedAuditReportPageProps = {
  token: string;
};

export function SharedAuditReportPage({ token }: SharedAuditReportPageProps) {
  const verification = useQuery(api.auditSharing.verifyShareToken, { token });
  const payload = useQuery(api.auditSharing.getShareableReport, { token });

  if (verification === undefined || payload === undefined) {
    return (
      <main className="shared-audit-shell">
        <PageLoader />
      </main>
    );
  }

  if (!verification.ok || !payload) {
    return (
      <main className="shared-audit-shell">
        <h1 className="audits-page__title">Link unavailable</h1>
        <p className="audit-detail__summary">
          This share link is invalid, expired, or has been revoked.
        </p>
      </main>
    );
  }

  return (
    <main className="shared-audit-shell">
      <SharedAuditReportViewer
        token={token}
        payload={payload}
        shareLinkId={String(verification.shareLinkId)}
      />
    </main>
  );
}
