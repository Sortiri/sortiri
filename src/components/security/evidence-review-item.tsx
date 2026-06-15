"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useArtifactDrawer } from "@/components/artifacts/artifact-context";
import { EvidenceSafetyBadges } from "@/components/security/evidence-safety-badges";
import type { Artifact, TimelineEvent } from "@/types/events";
import { canApproveForAudit } from "@/types/evidence-safety";
import "./security.css";

type EvidenceReviewItemProps = {
  kind: "artifact" | "event";
  item: Artifact | TimelineEvent;
  showActions?: boolean;
};

export function EvidenceReviewItem({
  kind,
  item,
  showActions = true,
}: EvidenceReviewItemProps) {
  const { openArtifact } = useArtifactDrawer();
  const approveArtifact = useMutation(api.evidenceReview.approveArtifactForAudit);
  const blockArtifact = useMutation(api.evidenceReview.blockArtifactFromAudit);
  const approveEvent = useMutation(api.evidenceReview.approveEventForAudit);
  const blockEvent = useMutation(api.evidenceReview.blockEventFromAudit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canApprove = canApproveForAudit(item.redactionStatus);

  const runAction = useCallback(
    async (action: "approve" | "block") => {
      setBusy(true);
      setError(null);
      try {
        if (kind === "artifact") {
          if (action === "approve") {
            await approveArtifact({ artifactId: item.id as Id<"artifacts"> });
          } else {
            await blockArtifact({ artifactId: item.id as Id<"artifacts"> });
          }
        } else if (action === "approve") {
          await approveEvent({ eventId: item.id as Id<"events"> });
        } else {
          await blockEvent({ eventId: item.id as Id<"events"> });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setBusy(false);
      }
    },
    [
      approveArtifact,
      approveEvent,
      blockArtifact,
      blockEvent,
      item.id,
      kind,
    ],
  );

  return (
    <article className="evidence-review-item">
      <div className="evidence-review-item__header">
        <div>
          <h3 className="evidence-review-item__title">{item.title}</h3>
          <p className="evidence-review-item__meta">
            {kind === "artifact" ? "Artifact" : "Event"}
            {item.summary ? ` · ${item.summary}` : ""}
          </p>
          <EvidenceSafetyBadges item={item} />
        </div>
        {kind === "artifact" ? (
          <button
            type="button"
            className="evidence-review-item__action"
            onClick={() => openArtifact(item.id)}
          >
            Open
          </button>
        ) : (
          <Link href={`/timeline?eventId=${item.id}`} className="evidence-review-item__action">
            Open
          </Link>
        )}
      </div>

      {showActions ? (
        <div className="evidence-review-item__actions">
          <button
            type="button"
            className="evidence-review-item__action"
            disabled={busy || !canApprove}
            onClick={() => void runAction("approve")}
          >
            Approve for audit
          </button>
          <button
            type="button"
            className="evidence-review-item__action"
            disabled={busy}
            onClick={() => void runAction("block")}
          >
            Block from audit
          </button>
        </div>
      ) : null}
      {error ? <p className="audit-modal__error">{error}</p> : null}
    </article>
  );
}
