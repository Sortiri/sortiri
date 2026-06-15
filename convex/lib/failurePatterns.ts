import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { listEventsInRange } from "./impactData";
import type { EventRecord } from "./eventsLib";
import type { LessonInput } from "./lessonsLib";
import { lessonFromFailurePattern } from "./lessonGeneration";

type DbReadCtx = Pick<QueryCtx, "db">;

const DEFAULT_WINDOW_DAYS = 7;
const DEFAULT_THRESHOLD = 3;
const SCAN_LIMIT = 1000;

type FailurePattern = {
  failureType: string;
  count: number;
  eventIds: Id<"events">[];
};

export function normalizeFailureType(event: EventRecord): string | null {
  const type = event.type ?? "";
  const category = event.category ?? "";

  if (type === "command.failed" || type === "build.failed") {
    return type;
  }
  if (type.includes("webhook") && (type.includes("signature") || type.includes("failed"))) {
    return "webhook.signature_failure";
  }
  if (type === "payment_intent.payment_failed") {
    return "payment.failed";
  }
  if (type.includes("permission") || type.includes("access_denied")) {
    return "permission.error";
  }
  if (type.includes("audit") && type.includes("blocked")) {
    return "audit.blocked_evidence";
  }
  if (type.includes("stripe") && type.includes("fail")) {
    return "stripe.webhook_failure";
  }
  if (type.includes("posthog") && type.includes("fail")) {
    return "posthog.webhook_failure";
  }
  if (type.includes("github") && type.includes("fail")) {
    return "github.webhook_failure";
  }
  return null;
}

export async function detectFailurePatterns(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  options: {
    windowDays?: number;
    threshold?: number;
  } = {},
): Promise<FailurePattern[]> {
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const end = Date.now();
  const start = end - windowDays * 24 * 60 * 60 * 1000;

  const events = await listEventsInRange(ctx, workspaceId, start, end, {
    scanLimit: SCAN_LIMIT,
  });

  const groups = new Map<string, Id<"events">[]>();
  for (const event of events) {
    const failureType = normalizeFailureType(event);
    if (!failureType) continue;
    const existing = groups.get(failureType) ?? [];
    existing.push(event.id as Id<"events">);
    groups.set(failureType, existing);
  }

  const patterns: FailurePattern[] = [];
  for (const [failureType, eventIds] of groups) {
    if (eventIds.length >= threshold) {
      patterns.push({ failureType, count: eventIds.length, eventIds });
    }
  }
  return patterns;
}

export async function generateLessonsFromFailurePatterns(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  options: {
    windowDays?: number;
    threshold?: number;
  } = {},
): Promise<LessonInput[]> {
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const patterns = await detectFailurePatterns(ctx, workspaceId, options);
  return patterns.map((pattern) =>
    lessonFromFailurePattern({
      workspaceId,
      failureType: pattern.failureType,
      count: pattern.count,
      windowDays,
      evidenceEventIds: pattern.eventIds,
    }),
  );
}
