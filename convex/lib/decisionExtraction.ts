import type { Doc } from "../_generated/dataModel";

export type ExtractedDecision = {
  title: string;
  summary?: string;
  decisionType: Doc<"decisions">["decisionType"];
  confidence: Doc<"decisionCandidates">["confidence"];
  signals: string[];
  entities: string[];
  tags: string[];
};

export type ExtractedRollback = {
  title: string;
  summary?: string;
  reason?: string;
};

const DECISION_PREFIX = /^\s*decision:\s*/i;
const DECIDED_PREFIX = /^\s*decided:\s*/i;
const ROLLBACK_PREFIX = /^\s*rollback:\s*/i;

const DECISION_PATTERNS = [
  /\bdecision:\s*(.+)/i,
  /\bdecided:\s*(.+)/i,
  /\bwe decided\b/i,
  /\bdecision made\b/i,
  /\blet's go with\b/i,
  /\bwe're choosing\b/i,
  /\bwe are choosing\b/i,
];

const ROLLBACK_PATTERNS = [
  /\brollback:\s*(.+)/i,
  /\brolled back\b/i,
  /\brevert(?:ed|ing)?\b/i,
  /\bbacked out\b/i,
];

function cleanTitle(text: string): string {
  return text
    .replace(DECISION_PREFIX, "")
    .replace(DECIDED_PREFIX, "")
    .replace(ROLLBACK_PREFIX, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function capitalizeTitle(text: string): string {
  if (!text) return "Untitled decision";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function classifyDecisionType(text: string): Doc<"decisions">["decisionType"] {
  const lower = text.toLowerCase();
  if (/\b(pric|billing|subscription|revenue|checkout|stripe)\b/.test(lower)) return "pricing";
  if (/\b(security|auth|oauth|permission|audit)\b/.test(lower)) return "security";
  if (/\b(design|ui|ux|layout)\b/.test(lower)) return "design";
  if (/\b(product|feature|onboarding|activation)\b/.test(lower)) return "product";
  if (/\b(gtm|go-to-market|marketing|launch)\b/.test(lower)) return "go_to_market";
  if (/\b(model|llm|agent|ai)\b/.test(lower)) return "model";
  if (/\b(ops|deploy|infra|reliability)\b/.test(lower)) return "ops";
  if (/\b(engineer|api|convex|next\.?js|code|refactor|architect)\b/.test(lower)) return "engineering";
  return "other";
}

export function extractEntitiesFromDecisionText(text: string): string[] {
  const entities: string[] = [];
  const pr = text.match(/#(\d+)/g);
  if (pr) entities.push(...pr.map((m) => m.slice(1)));
  const mentions = text.match(/@[\w.-]+/g);
  if (mentions) entities.push(...mentions.map((m) => m.slice(1)));
  return [...new Set(entities)];
}

export function matchesDecisionPattern(text: string): boolean {
  return DECISION_PATTERNS.some((p) => p.test(text));
}

export function matchesRollbackPattern(text: string): boolean {
  return ROLLBACK_PATTERNS.some((p) => p.test(text));
}

export function extractDecisionCandidateFromText(text: string): ExtractedDecision | null {
  if (!matchesDecisionPattern(text)) return null;

  let body = text.trim();
  const prefixMatch = body.match(/^(?:decision|decided):\s*(.+)/i);
  if (prefixMatch) {
    body = prefixMatch[1] ?? body;
  } else {
    const goWith = body.match(/let's go with\s+(.+)/i);
    const choosing = body.match(/we(?:'re| are) choosing\s+(.+)/i);
    body = goWith?.[1] ?? choosing?.[1] ?? body;
  }

  const title = capitalizeTitle(cleanTitle(body).slice(0, 200));
  const decisionType = classifyDecisionType(text);
  const confidence: Doc<"decisionCandidates">["confidence"] =
    DECISION_PREFIX.test(text) || DECIDED_PREFIX.test(text) ? "strong" : "likely";

  return {
    title,
    summary: text.slice(0, 500),
    decisionType,
    confidence,
    signals: ["decision_pattern"],
    entities: extractEntitiesFromDecisionText(text),
    tags: ["decision"],
  };
}

export function extractRollbackFromText(text: string): ExtractedRollback | null {
  if (!matchesRollbackPattern(text)) return null;

  let body = text.trim();
  const prefixMatch = body.match(/^rollback:\s*(.+)/i);
  if (prefixMatch) body = prefixMatch[1] ?? body;

  const title = capitalizeTitle(cleanTitle(body).slice(0, 200));
  return {
    title,
    summary: text.slice(0, 500),
    reason: body,
  };
}

export function redactSlackPreview(text: string, maxLen = 280): string {
  const redacted = text
    .replace(/xox[baprs]-[\w-]+/gi, "[redacted-token]")
    .replace(/sk_[\w-]+/gi, "[redacted-key]")
    .replace(/whsec_[\w]+/gi, "[redacted-secret]")
    .replace(/\b[\w.+-]+@[\w.-]+\.\w+\b/g, "[redacted-email]");
  return redacted.length > maxLen ? `${redacted.slice(0, maxLen)}…` : redacted;
}
