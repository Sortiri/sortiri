export type SensitivityLevel = "public" | "internal" | "confidential" | "restricted";

export type RedactionStatus =
  | "none"
  | "redacted"
  | "needs_review"
  | "approved"
  | "blocked";

export type SensitiveFindingSeverity = "low" | "medium" | "high" | "critical";

export type SensitiveFinding = {
  type: string;
  label: string;
  count: number;
  severity: SensitiveFindingSeverity;
};

export type SensitiveScanResult = {
  hasSensitiveContent: boolean;
  maxSeverity: SensitiveFindingSeverity;
  findings: SensitiveFinding[];
};

export type EvidenceSafetySummary = {
  includedItems: number;
  excludedArtifacts: number;
  excludedEvents: number;
  needsReview: number;
  blocked: number;
};

export type EvidenceReviewer = {
  clerkUserId?: string;
  email?: string;
  name?: string;
};

export function isSafeForAudit(args: {
  safeForAudit?: boolean;
  redactionStatus?: RedactionStatus;
}): boolean {
  if (args.safeForAudit === false) return false;
  if (args.redactionStatus === "blocked") return false;
  return true;
}

export function canApproveForAudit(redactionStatus?: RedactionStatus): boolean {
  return redactionStatus === "redacted";
}

export function sensitivityLabel(level?: SensitivityLevel): string {
  return (level ?? "internal").toUpperCase();
}

export function redactionStatusLabel(status?: RedactionStatus): string | null {
  if (!status || status === "none") return null;
  switch (status) {
    case "redacted":
      return "REDACTED";
    case "needs_review":
      return "NEEDS REVIEW";
    case "approved":
      return "APPROVED FOR AUDIT";
    case "blocked":
      return "BLOCKED";
  }
}
