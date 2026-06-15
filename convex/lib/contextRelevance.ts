export const DEFAULT_CONTEXT_TIME_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export const CONTEXT_KEYWORD_TERMS = [
  "onboarding",
  "checkout",
  "pricing",
  "auth",
  "stripe",
  "posthog",
  "github",
  "webhook",
  "activation",
  "revenue",
  "signup",
  "audit",
  "permissions",
  "source health",
  "evidence",
  "redaction",
] as const;

export function tokenizeGoal(goal: string): string[] {
  return goal
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

export function matchesGoalText(haystack: string, goal: string): boolean {
  const normalized = haystack.toLowerCase();
  const tokens = tokenizeGoal(goal);
  if (tokens.length === 0) return false;
  return tokens.some((token) => normalized.includes(token));
}

export function matchesAnyKeyword(text: string): boolean {
  const normalized = text.toLowerCase();
  return CONTEXT_KEYWORD_TERMS.some((term) => normalized.includes(term));
}

export function normalizeFilePath(path: string): string {
  return path.trim().replace(/\\/g, "/");
}

export function filePathMatchesEvent(path: string, eventText: string): boolean {
  const normalized = normalizeFilePath(path).toLowerCase();
  const haystack = eventText.toLowerCase();
  if (haystack.includes(normalized)) return true;
  const basename = normalized.split("/").pop();
  return Boolean(basename && basename.length > 3 && haystack.includes(basename));
}

export function scoreRelevance(goal: string, text: string): number {
  const tokens = tokenizeGoal(goal);
  const normalized = text.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (normalized.includes(token)) score += 2;
  }
  if (matchesAnyKeyword(normalized)) score += 1;
  return score;
}
