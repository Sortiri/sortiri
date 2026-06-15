import {
  redactionStatusLabel,
  sensitivityLabel,
} from "@/types/evidence-safety";
import type { Artifact, TimelineEvent } from "@/types/events";
import "./security.css";

type SafetyTarget = Pick<
  Artifact | TimelineEvent,
  "sensitivity" | "redactionStatus" | "safeForAudit"
>;

export function EvidenceSafetyBadges({ item }: { item: SafetyTarget }) {
  const badges: string[] = [];
  const sensitivity = item.sensitivity ?? "internal";
  if (sensitivity !== "internal") {
    badges.push(sensitivityLabel(sensitivity));
  }
  const redaction = redactionStatusLabel(item.redactionStatus);
  if (redaction) badges.push(redaction);

  if (badges.length === 0) return null;

  return (
    <div className="evidence-safety-badges">
      {badges.map((badge) => (
        <span key={badge} className="evidence-safety-badge">
          {badge}
        </span>
      ))}
    </div>
  );
}

export function EvidenceSafetyNote({ item }: { item: SafetyTarget }) {
  if (item.redactionStatus === "blocked") {
    return (
      <p className="evidence-safety-note evidence-safety-note--blocked">
        This content is blocked from audit export and may be hidden from external reviewers.
      </p>
    );
  }
  if (
    item.redactionStatus === "redacted" ||
    item.redactionStatus === "needs_review"
  ) {
    return (
      <p className="evidence-safety-note">
        Sensitive values were redacted. Review in Evidence Review before audit export.
      </p>
    );
  }
  return null;
}
