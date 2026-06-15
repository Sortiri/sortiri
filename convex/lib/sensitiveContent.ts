import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type {
  EvidenceReviewer,
  SensitiveFinding,
  SensitiveScanResult,
} from "../../src/types/evidence-safety";
import { insertEvent } from "./eventsLib";

export type { SensitiveFinding, SensitiveScanResult };

const SEVERITY_RANK = { low: 1, medium: 2, high: 3, critical: 4 } as const;

type PatternDef = {
  type: string;
  label: string;
  severity: SensitiveFinding["severity"];
  pattern: RegExp;
};

const PATTERNS: PatternDef[] = [
  { type: "openai_api_key", label: "OpenAI API Key", severity: "critical", pattern: /OPENAI_API_KEY\s*=\s*[^\s'"]+/gi },
  { type: "anthropic_api_key", label: "Anthropic API Key", severity: "critical", pattern: /ANTHROPIC_API_KEY\s*=\s*[^\s'"]+/gi },
  { type: "stripe_secret_key", label: "Stripe Secret Key", severity: "critical", pattern: /STRIPE_SECRET_KEY\s*=\s*[^\s'"]+/gi },
  { type: "github_token", label: "GitHub Token", severity: "critical", pattern: /GITHUB_TOKEN\s*=\s*[^\s'"]+/gi },
  { type: "stripe_sk", label: "Stripe Secret Key", severity: "critical", pattern: /\bsk_live_[A-Za-z0-9]+\b/g },
  { type: "stripe_test_sk", label: "Stripe Test Key", severity: "high", pattern: /\bsk_test_[A-Za-z0-9]+\b/g },
  { type: "private_key", label: "Private Key", severity: "critical", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { type: "bearer_token", label: "Bearer Token", severity: "high", pattern: /\bBearer\s+[A-Za-z0-9._\-+/=]{8,}\b/gi },
  { type: "jwt_token", label: "JWT Token", severity: "high", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { type: "database_url", label: "Database URL", severity: "high", pattern: /\b(?:postgres|postgresql|mongodb):\/\/[^\s'"]+/gi },
  { type: "password_assignment", label: "Password Assignment", severity: "high", pattern: /password\s*=\s*[^\s'"]+/gi },
  { type: "secret_assignment", label: "Secret Assignment", severity: "high", pattern: /secret\s*=\s*[^\s'"]+/gi },
  { type: "token_assignment", label: "Token Assignment", severity: "high", pattern: /token\s*=\s*[^\s'"]+/gi },
  { type: "env_line", label: "Environment Variable", severity: "medium", pattern: /^[A-Z][A-Z0-9_]{2,}\s*=\s*[^\s'"]+/gm },
];

const REDACT_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /OPENAI_API_KEY\s*=\s*[^\s'"]+/gi, replacement: "OPENAI_API_KEY=[REDACTED: OPENAI_API_KEY]" },
  { pattern: /ANTHROPIC_API_KEY\s*=\s*[^\s'"]+/gi, replacement: "ANTHROPIC_API_KEY=[REDACTED: ANTHROPIC_API_KEY]" },
  { pattern: /STRIPE_SECRET_KEY\s*=\s*[^\s'"]+/gi, replacement: "STRIPE_SECRET_KEY=[REDACTED: STRIPE_SECRET_KEY]" },
  { pattern: /GITHUB_TOKEN\s*=\s*[^\s'"]+/gi, replacement: "GITHUB_TOKEN=[REDACTED: GITHUB_TOKEN]" },
  { pattern: /\bsk_live_[A-Za-z0-9]+\b/g, replacement: "[REDACTED: STRIPE_SECRET_KEY]" },
  { pattern: /\bsk_test_[A-Za-z0-9]+\b/g, replacement: "[REDACTED: STRIPE_TEST_KEY]" },
  { pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, replacement: "[REDACTED: PRIVATE_KEY]" },
  { pattern: /\bBearer\s+[A-Za-z0-9._\-+/=]{8,}\b/gi, replacement: "Bearer [REDACTED: BEARER_TOKEN]" },
  { pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, replacement: "[REDACTED: JWT_TOKEN]" },
  { pattern: /\b(?:postgres|postgresql|mongodb):\/\/[^\s'"]+/gi, replacement: "[REDACTED: DATABASE_URL]" },
  { pattern: /password\s*=\s*[^\s'"]+/gi, replacement: "password=[REDACTED: PASSWORD]" },
  { pattern: /secret\s*=\s*[^\s'"]+/gi, replacement: "secret=[REDACTED: SECRET]" },
  { pattern: /token\s*=\s*[^\s'"]+/gi, replacement: "token=[REDACTED: TOKEN]" },
];

function mergeFindings(findings: SensitiveFinding[]): SensitiveFinding[] {
  const map = new Map<string, SensitiveFinding>();
  for (const finding of findings) {
    const key = `${finding.type}:${finding.severity}`;
    const existing = map.get(key);
    if (existing) existing.count += finding.count;
    else map.set(key, { ...finding });
  }
  return Array.from(map.values());
}

export function scanSensitiveContent(input: string): SensitiveScanResult {
  if (!input) {
    return { hasSensitiveContent: false, maxSeverity: "low", findings: [] };
  }
  const findings: SensitiveFinding[] = [];
  for (const def of PATTERNS) {
    const matches = input.match(def.pattern);
    if (matches?.length) {
      findings.push({ type: def.type, label: def.label, count: matches.length, severity: def.severity });
    }
  }
  const merged = mergeFindings(findings);
  if (!merged.length) {
    return { hasSensitiveContent: false, maxSeverity: "low", findings: [] };
  }
  const maxSeverity = merged.reduce<SensitiveFinding["severity"]>(
    (max, f) => (SEVERITY_RANK[f.severity] > SEVERITY_RANK[max] ? f.severity : max),
    "low",
  );
  return { hasSensitiveContent: true, maxSeverity, findings: merged };
}

export function redactSensitiveContent(input: string): { redacted: string; scan: SensitiveScanResult } {
  const scan = scanSensitiveContent(input);
  if (!scan.hasSensitiveContent) return { redacted: input, scan };
  let redacted = input;
  for (const { pattern, replacement } of REDACT_PATTERNS) {
    redacted = redacted.replace(pattern, replacement);
  }
  return { redacted, scan };
}

export function truncateForScan(input: string, maxChars = 50_000): string {
  return input.length <= maxChars ? input : input.slice(0, maxChars);
}

export type ArtifactSafetyFields = {
  content?: string;
  sensitivity: Doc<"artifacts">["sensitivity"];
  redactionStatus: Doc<"artifacts">["redactionStatus"];
  safeForAudit: boolean;
  sensitiveFindings?: SensitiveFinding[];
};

export type EventSafetyFields = {
  title: string;
  summary?: string;
  entity?: Doc<"events">["entity"];
  actor?: Doc<"events">["actor"];
  data?: unknown;
  sensitivity: Doc<"events">["sensitivity"];
  redactionStatus?: Doc<"events">["redactionStatus"];
  safeForAudit: boolean;
  sensitiveFindings?: SensitiveFinding[];
};

function mapScanToSafety(scan: SensitiveScanResult): Pick<
  ArtifactSafetyFields,
  "sensitivity" | "redactionStatus" | "safeForAudit" | "sensitiveFindings"
> {
  if (!scan.hasSensitiveContent) {
    return { sensitivity: "internal", redactionStatus: "none", safeForAudit: true };
  }
  const sensitiveFindings = scan.findings;
  if (scan.maxSeverity === "medium") {
    return {
      sensitivity: "confidential",
      redactionStatus: "redacted",
      safeForAudit: false,
      sensitiveFindings,
    };
  }
  return {
    sensitivity: "restricted",
    redactionStatus: "needs_review",
    safeForAudit: false,
    sensitiveFindings,
  };
}

export function applyArtifactSafety(content?: string): ArtifactSafetyFields {
  if (!content) {
    return {
      content,
      sensitivity: "internal",
      redactionStatus: "none",
      safeForAudit: true,
    };
  }
  const { redacted, scan } = redactSensitiveContent(content);
  const mapped = mapScanToSafety(scan);
  return {
    content: scan.hasSensitiveContent ? redacted : content,
    ...mapped,
    redactionStatus: scan.hasSensitiveContent
      ? mapped.redactionStatus === "needs_review"
        ? "needs_review"
        : "redacted"
      : "none",
  };
}

export function applyEventSafety(input: {
  title: string;
  summary?: string;
  entity?: Doc<"events">["entity"];
  actor?: Doc<"events">["actor"];
  data?: unknown;
}): EventSafetyFields {
  const parts: string[] = [input.title];
  if (input.summary) parts.push(input.summary);
  if (input.entity?.name) parts.push(input.entity.name);
  if (input.entity?.url) parts.push(input.entity.url);
  if (input.actor?.email) parts.push(input.actor.email);
  if (input.actor?.name) parts.push(input.actor.name);
  if (input.data !== undefined) {
    try {
      parts.push(JSON.stringify(input.data));
    } catch {
      parts.push(String(input.data));
    }
  }
  const scanInput = truncateForScan(parts.join("\n"));
  const scan = scanSensitiveContent(scanInput);
  const mapped = mapScanToSafety(scan);

  let title = input.title;
  let summary = input.summary;
  if (scan.hasSensitiveContent) {
    title = redactSensitiveContent(input.title).redacted;
    if (input.summary) summary = redactSensitiveContent(input.summary).redacted;
  }

  return {
    title,
    summary,
    entity: input.entity,
    actor: input.actor,
    data: input.data,
    sensitivity: mapped.sensitivity,
    redactionStatus: mapped.redactionStatus,
    safeForAudit: mapped.safeForAudit,
    sensitiveFindings: mapped.sensitiveFindings,
  };
}

export function isArtifactSafeForAudit(doc: Pick<Doc<"artifacts">, "safeForAudit" | "redactionStatus">): boolean {
  if (doc.safeForAudit === false) return false;
  if (doc.redactionStatus === "blocked") return false;
  return true;
}

export function isEventSafeForAudit(doc: Pick<Doc<"events">, "safeForAudit" | "redactionStatus">): boolean {
  if (doc.safeForAudit === false) return false;
  if (doc.redactionStatus === "blocked") return false;
  return true;
}

type DbWriteCtx = Pick<MutationCtx, "db">;

export async function recordEvidenceSafetyEvent(
  ctx: DbWriteCtx,
  args: {
    workspaceId: Id<"workspaces">;
    type:
      | "evidence.sensitive_content_detected"
      | "evidence.artifact_approved_for_audit"
      | "evidence.artifact_blocked_from_audit"
      | "evidence.event_approved_for_audit"
      | "evidence.event_blocked_from_audit"
      | "evidence.safety_backfill_completed";
    title: string;
    summary?: string;
    actor?: EvidenceReviewer;
    importance?: "normal" | "high" | "critical";
    data?: Record<string, unknown>;
  },
): Promise<void> {
  await insertEvent(ctx, {
    workspaceId: args.workspaceId,
    source: "system",
    category: "system_event",
    type: args.type,
    actor: {
      type: "human",
      id: args.actor?.clerkUserId,
      name: args.actor?.name ?? args.actor?.email ?? "User",
      email: args.actor?.email,
    },
    title: args.title,
    summary: args.summary,
    data: args.data,
    importance: args.importance ?? "normal",
    visibility: "primary",
    tags: ["meta", "evidence_safety"],
  });
}
