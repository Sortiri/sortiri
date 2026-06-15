import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { EventRecord } from "./eventsLib";
import { listEventsInRange } from "./impactData";
import { normalizeFailureType } from "./failurePatterns";
import { canViewEvent } from "./authz";
import type { AccessibleProjects } from "./projectAccessLib";
import { filePathMatchesEvent, matchesGoalText } from "./contextRelevance";

type DbReadCtx = Pick<QueryCtx, "db">;

export type KnownFailureItem = {
  failureType: string;
  title: string;
  summary: string;
  lastSeenAt: number;
  count: number;
  evidenceEventIds: string[];
  recommendedValidation?: string;
};

const VALIDATION_BY_FAILURE: Record<string, string> = {
  "command.failed": "npm run test:all",
  "build.failed": "npm run typecheck && npm run test:unit",
  "webhook.signature_failure": "npx tsx scripts/test-github-webhook.ts",
  "payment.failed": "npx tsx scripts/test-stripe-webhook.ts",
  "permission.error": "npm run test:e2e",
  "audit.blocked_evidence": "npx tsx scripts/sanity-evidence-safety.ts",
  "stripe.webhook_failure": "npx tsx scripts/test-stripe-webhook.ts",
  "posthog.webhook_failure": "npx tsx scripts/test-posthog-webhook.ts",
  "github.webhook_failure": "npx tsx scripts/test-github-webhook.ts",
};

function failureTitle(type: string, event: EventRecord): string {
  if (event.title?.trim()) return event.title;
  return type.replace(/\./g, " ");
}

export async function collectKnownFailures(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  options: {
    windowMs: number;
    goal?: string;
    files?: string[];
    projectId?: Id<"projects">;
    accessible: AccessibleProjects;
    limit?: number;
  },
): Promise<KnownFailureItem[]> {
  const end = Date.now();
  const start = end - options.windowMs;
  const events = await listEventsInRange(ctx, workspaceId, start, end, {
    projectId: options.projectId,
    accessibleProjects: options.accessible,
    scanLimit: 1500,
  });

  const groups = new Map<string, EventRecord[]>();
  for (const event of events) {
    if (!canViewEvent(event, options.accessible)) continue;
    const failureType = normalizeFailureType(event);
    if (!failureType) continue;

    const eventText = `${event.title} ${event.summary ?? ""} ${event.type}`;
    if (options.goal && !matchesGoalText(eventText, options.goal)) {
      const fileMatch =
        options.files?.some((file) => filePathMatchesEvent(file, eventText)) ?? false;
      if (!fileMatch) continue;
    }

    const existing = groups.get(failureType) ?? [];
    existing.push(event);
    groups.set(failureType, existing);
  }

  const items: KnownFailureItem[] = [];
  for (const [failureType, group] of groups) {
    group.sort((a, b) => (b.occurredAt ?? 0) - (a.occurredAt ?? 0));
    const latest = group[0]!;
    items.push({
      failureType,
      title: failureTitle(failureType, latest),
      summary: latest.summary ?? `Observed ${group.length} related failure events.`,
      lastSeenAt: latest.occurredAt ?? latest.createdAt,
      count: group.length,
      evidenceEventIds: group.slice(0, 5).map((e) => e.id),
      recommendedValidation: VALIDATION_BY_FAILURE[failureType],
    });
  }

  return items
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
    .slice(0, options.limit ?? 10);
}
