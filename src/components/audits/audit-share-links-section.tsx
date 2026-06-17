"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PageLoader } from "@/components/ui/page-loader";
import type { AuditShareLinkRecord, ShareLinkExpiry } from "@/types/audit-sharing";
import { SHARE_LINK_EXPIRY_OPTIONS } from "@/types/audit-sharing";

type AuditShareLinksSectionProps = {
  reportId: string;
  isFinalized: boolean;
};

export function AuditShareLinksSection({
  reportId,
  isFinalized,
}: AuditShareLinksSectionProps) {
  const links = useQuery(api.auditSharing.listShareLinks, {
    reportId: reportId as Id<"auditReports">,
  });
  const createShareLink = useMutation(api.auditSharing.createShareLink);
  const revokeShareLink = useMutation(api.auditSharing.revokeShareLink);

  const [expiresIn, setExpiresIn] = useState<ShareLinkExpiry>("7d");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<{
    shareUrl: string;
    rawToken: string;
    expiresAt: number;
  } | null>(null);

  const handleCreate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await createShareLink({
        reportId: reportId as Id<"auditReports">,
        expiresIn,
      });
      setCreatedLink({
        shareUrl: result.shareUrl,
        rawToken: result.rawToken,
        expiresAt: result.expiresAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create share link");
    } finally {
      setBusy(false);
    }
  }, [createShareLink, expiresIn, reportId]);

  const handleRevoke = useCallback(
    async (shareLinkId: string) => {
      setBusy(true);
      setError(null);
      try {
        await revokeShareLink({ shareLinkId: shareLinkId as Id<"auditShareLinks"> });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not revoke share link");
      } finally {
        setBusy(false);
      }
    },
    [revokeShareLink],
  );

  const handleCopy = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setError("Could not copy to clipboard");
    }
  }, []);

  if (!isFinalized) {
    return null;
  }

  return (
    <section className="audit-share-links-section">
      <h2 className="evidence-review-section__title">Share Links</h2>
      <p className="audit-share-links-section__warning">
        Anyone with this link can view this finalized audit report until the link expires or is
        revoked. Only evidence included in this report is exposed.
      </p>

      <div className="audit-share-links-section__create">
        <label className="audit-share-links-section__label">
          Expiry
          <select
            value={expiresIn}
            onChange={(event) => setExpiresIn(event.target.value as ShareLinkExpiry)}
            disabled={busy}
          >
            {SHARE_LINK_EXPIRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="audit-detail__action"
          disabled={busy}
          onClick={() => void handleCreate()}
        >
          {busy ? "Working…" : "Create link"}
        </button>
      </div>

      {createdLink ? (
        <div className="audit-share-links-section__created">
          <p className="audit-share-links-section__warning">
            Copy this link now — it will not be shown again.
          </p>
          <code className="audit-share-links-section__token">{createdLink.shareUrl}</code>
          <div className="audit-export-section__actions">
            <button
              type="button"
              className="audit-detail__action"
              onClick={() => void handleCopy(createdLink.shareUrl)}
            >
              Copy link
            </button>
            <button
              type="button"
              className="audit-detail__action"
              onClick={() => setCreatedLink(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="audit-modal__error">{error}</p> : null}

      {links === undefined ? (
        <PageLoader variant="section" />
      ) : links.length === 0 ? (
        <p className="audit-detail__summary">No share links yet.</p>
      ) : (
        <table className="audit-share-links-table">
          <thead>
            <tr>
              <th>Link</th>
              <th>Status</th>
              <th>Expires</th>
              <th>Last accessed</th>
              <th>Access count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link: AuditShareLinkRecord) => (
              <tr key={link.id}>
                <td>
                  <code>{link.maskedToken}</code>
                </td>
                <td>{link.status}</td>
                <td>{new Date(link.expiresAt).toLocaleString()}</td>
                <td>
                  {link.lastAccessedAt
                    ? new Date(link.lastAccessedAt).toLocaleString()
                    : "—"}
                </td>
                <td>{link.accessCount}</td>
                <td>
                  {link.status === "active" ? (
                    <button
                      type="button"
                      className="audit-evidence-item__link"
                      disabled={busy}
                      onClick={() => void handleRevoke(link.id)}
                    >
                      Revoke
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
