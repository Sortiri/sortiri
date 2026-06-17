"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { EvidenceReviewItem } from "@/components/security/evidence-review-item";
import { PageLoader } from "@/components/ui/page-loader";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import "./security.css";

export function EvidenceReviewPage() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canManage = capabilities?.canManageAuditReports ?? false;

  const reviewList = useQuery(
    api.evidenceReview.listNeedsReview,
    activeWorkspaceId && canManage ? { workspaceId: activeWorkspaceId } : "skip",
  );

  const backfill = useMutation(api.evidenceReview.backfillSensitivity);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleBackfill = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await backfill({ workspaceId: activeWorkspaceId, limit: 200 });
      setMessage(
        `Backfill complete: ${result.artifactsUpdated} artifacts and ${result.eventsUpdated} events updated.`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Backfill failed");
    } finally {
      setBusy(false);
    }
  }, [activeWorkspaceId, backfill]);

  if (wsLoading) {
    return <PageLoader />;
  }

  if (!canManage) {
    return (
      <div>
        <h1 className="evidence-review-page__title">Evidence Review</h1>
        <p className="evidence-review-page__subtitle">
          Only workspace owners and admins can review sensitive evidence.
        </p>
      </div>
    );
  }

  if (reviewList === undefined) {
    return <PageLoader />;
  }

  const sections = [
    { key: "needsReview", title: "Needs Review", items: reviewList.needsReview },
    { key: "restricted", title: "Restricted", items: reviewList.restricted },
    { key: "redacted", title: "Redacted", items: reviewList.redacted },
    { key: "approved", title: "Approved for Audit", items: reviewList.approved, showActions: false },
    { key: "blocked", title: "Blocked", items: reviewList.blocked, showActions: false },
  ] as const;

  return (
    <div className="evidence-review-page">
      <header>
        <h1 className="evidence-review-page__title">Evidence Review</h1>
        <p className="evidence-review-page__subtitle">
          Review redacted artifacts and events before they appear in audit reports.
        </p>
        <button
          type="button"
          className="evidence-review-item__action"
          disabled={busy || !activeWorkspaceId}
          onClick={() => void handleBackfill()}
        >
          {busy ? "Backfilling…" : "Backfill evidence safety"}
        </button>
        {message ? <p className="evidence-review-page__subtitle">{message}</p> : null}
      </header>

      {sections.map((section) =>
        section.items.length > 0 ? (
          <section key={section.key} className="evidence-review-section">
            <h2 className="evidence-review-section__title">
              {section.title} ({section.items.length})
            </h2>
            {section.items.map((entry) => (
              <EvidenceReviewItem
                key={`${entry.kind}-${entry.item.id}`}
                kind={entry.kind}
                item={entry.item}
                showActions={"showActions" in section ? section.showActions : true}
              />
            ))}
          </section>
        ) : null,
      )}

      {sections.every((section) => section.items.length === 0) ? (
        <p className="evidence-review-page__subtitle">
          No sensitive evidence needs review right now.
        </p>
      ) : null}
    </div>
  );
}
