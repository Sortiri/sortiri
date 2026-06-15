import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { getCurrentUser, requireWorkspaceRole } from "./lib/authz";
import { docToArtifact } from "./lib/artifactsLib";
import { docToEvent } from "./lib/eventsLib";
import {
  applyArtifactSafety,
  applyEventSafety,
  recordEvidenceSafetyEvent,
} from "./lib/sensitiveContent";
import { redactionStatusValidator } from "./lib/validators";
import type { Artifact, TimelineEvent } from "../src/types/events";
import { canApproveForAudit } from "../src/types/evidence-safety";

export type EvidenceReviewItem =
  | { kind: "artifact"; item: Artifact }
  | { kind: "event"; item: TimelineEvent };

export type EvidenceReviewList = {
  needsReview: EvidenceReviewItem[];
  restricted: EvidenceReviewItem[];
  redacted: EvidenceReviewItem[];
  approved: EvidenceReviewItem[];
  blocked: EvidenceReviewItem[];
};

type DbReadCtx = Pick<QueryCtx, "db">;

function toReviewer(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  return {
    clerkUserId: user.clerkUserId,
    email: user.email,
    name: user.name,
  };
}

async function listArtifactsByStatuses(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  statuses: Array<NonNullable<Doc<"artifacts">["redactionStatus"]>>,
): Promise<Doc<"artifacts">[]> {
  const results: Doc<"artifacts">[] = [];
  for (const status of statuses) {
    const rows = await ctx.db
      .query("artifacts")
      .withIndex("by_workspace_redaction_status", (q) =>
        q.eq("workspaceId", workspaceId).eq("redactionStatus", status),
      )
      .collect();
    results.push(...rows);
  }
  return results.sort((a, b) => b.createdAt - a.createdAt);
}

async function listEventsByStatuses(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  statuses: Array<NonNullable<Doc<"events">["redactionStatus"]>>,
): Promise<Doc<"events">[]> {
  const results: Doc<"events">[] = [];
  for (const status of statuses) {
    const rows = await ctx.db
      .query("events")
      .withIndex("by_workspace_redaction_status", (q) =>
        q.eq("workspaceId", workspaceId).eq("redactionStatus", status),
      )
      .collect();
    results.push(...rows);
  }
  return results.sort((a, b) => b.occurredAt - a.occurredAt);
}

function groupReviewItems(
  artifacts: Doc<"artifacts">[],
  events: Doc<"events">[],
): EvidenceReviewList {
  const needsReview: EvidenceReviewItem[] = [];
  const restricted: EvidenceReviewItem[] = [];
  const redacted: EvidenceReviewItem[] = [];
  const approved: EvidenceReviewItem[] = [];
  const blocked: EvidenceReviewItem[] = [];

  for (const doc of artifacts) {
    const item = { kind: "artifact" as const, item: docToArtifact(doc) };
    if (doc.redactionStatus === "blocked") blocked.push(item);
    else if (doc.redactionStatus === "approved") approved.push(item);
    else if (doc.redactionStatus === "needs_review") needsReview.push(item);
    else if (doc.redactionStatus === "redacted") redacted.push(item);
    else if (doc.sensitivity === "restricted") restricted.push(item);
  }

  for (const doc of events) {
    const item = { kind: "event" as const, item: docToEvent(doc) };
    if (doc.redactionStatus === "blocked") blocked.push(item);
    else if (doc.redactionStatus === "approved") approved.push(item);
    else if (doc.redactionStatus === "needs_review") needsReview.push(item);
    else if (doc.redactionStatus === "redacted") redacted.push(item);
    else if (doc.sensitivity === "restricted") restricted.push(item);
  }

  return { needsReview, restricted, redacted, approved, blocked };
}

export const listNeedsReview = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args): Promise<EvidenceReviewList> => {
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);

    const artifacts = await listArtifactsByStatuses(ctx, workspace._id, [
      "needs_review",
      "redacted",
      "approved",
      "blocked",
    ]);
    const events = await listEventsByStatuses(ctx, workspace._id, [
      "needs_review",
      "redacted",
      "approved",
      "blocked",
    ]);

    const allArtifacts = await ctx.db
      .query("artifacts")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();
    const restrictedArtifacts = allArtifacts.filter((doc) => doc.sensitivity === "restricted");

    const mergedArtifacts = [
      ...artifacts,
      ...restrictedArtifacts.filter(
        (doc) => !artifacts.some((existing) => existing._id === doc._id),
      ),
    ];

    return groupReviewItems(mergedArtifacts, events);
  },
});

export const listByStatus = query({
  args: {
    workspaceId: v.string(),
    redactionStatus: redactionStatusValidator,
  },
  handler: async (ctx, args): Promise<EvidenceReviewItem[]> => {
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);

    const artifacts = await listArtifactsByStatuses(ctx, workspace._id, [
      args.redactionStatus,
    ]);
    const events = await listEventsByStatuses(ctx, workspace._id, [args.redactionStatus]);

    const items: EvidenceReviewItem[] = [
      ...artifacts.map((doc) => ({ kind: "artifact" as const, item: docToArtifact(doc) })),
      ...events.map((doc) => ({ kind: "event" as const, item: docToEvent(doc) })),
    ];

    return items.sort((a, b) => {
      const aTime = a.kind === "artifact" ? a.item.createdAt : a.item.occurredAt;
      const bTime = b.kind === "artifact" ? b.item.createdAt : b.item.occurredAt;
      return bTime - aTime;
    });
  },
});

export const approveArtifactForAudit = mutation({
  args: { artifactId: v.id("artifacts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const doc = await ctx.db.get(args.artifactId);
    if (!doc) throw new Error("Artifact not found");

    const workspace = await ctx.db.get(doc.workspaceId);
    if (!workspace) throw new Error("Artifact not found");

    await requireWorkspaceRole(ctx, workspace.externalId, ["owner", "admin"]);

    if (!canApproveForAudit(doc.redactionStatus)) {
      throw new Error("Only redacted artifacts can be approved for audit");
    }

    const now = Date.now();
    const reviewer = toReviewer(user);
    await ctx.db.patch(args.artifactId, {
      redactionStatus: "approved",
      safeForAudit: true,
      reviewedBy: reviewer,
      reviewedAt: now,
    });

    await recordEvidenceSafetyEvent(ctx, {
      workspaceId: doc.workspaceId,
      type: "evidence.artifact_approved_for_audit",
      title: `Artifact approved for audit: ${doc.title}`,
      actor: reviewer,
      data: { artifactId: args.artifactId },
    });

    return { success: true };
  },
});

export const blockArtifactFromAudit = mutation({
  args: { artifactId: v.id("artifacts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const doc = await ctx.db.get(args.artifactId);
    if (!doc) throw new Error("Artifact not found");

    const workspace = await ctx.db.get(doc.workspaceId);
    if (!workspace) throw new Error("Artifact not found");

    await requireWorkspaceRole(ctx, workspace.externalId, ["owner", "admin"]);

    const now = Date.now();
    const reviewer = toReviewer(user);
    await ctx.db.patch(args.artifactId, {
      redactionStatus: "blocked",
      safeForAudit: false,
      reviewedBy: reviewer,
      reviewedAt: now,
    });

    await recordEvidenceSafetyEvent(ctx, {
      workspaceId: doc.workspaceId,
      type: "evidence.artifact_blocked_from_audit",
      title: `Artifact blocked from audit: ${doc.title}`,
      actor: reviewer,
      importance: "high",
      data: { artifactId: args.artifactId },
    });

    return { success: true };
  },
});

export const approveEventForAudit = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const doc = await ctx.db.get(args.eventId);
    if (!doc) throw new Error("Event not found");

    const workspace = await ctx.db.get(doc.workspaceId);
    if (!workspace) throw new Error("Event not found");

    await requireWorkspaceRole(ctx, workspace.externalId, ["owner", "admin"]);

    if (!canApproveForAudit(doc.redactionStatus)) {
      throw new Error("Only redacted events can be approved for audit");
    }

    const now = Date.now();
    const reviewer = toReviewer(user);
    await ctx.db.patch(args.eventId, {
      redactionStatus: "approved",
      safeForAudit: true,
      reviewedBy: reviewer,
      reviewedAt: now,
    });

    await recordEvidenceSafetyEvent(ctx, {
      workspaceId: doc.workspaceId,
      type: "evidence.event_approved_for_audit",
      title: `Event approved for audit: ${doc.title}`,
      actor: reviewer,
      data: { eventId: args.eventId },
    });

    return { success: true };
  },
});

export const blockEventFromAudit = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const doc = await ctx.db.get(args.eventId);
    if (!doc) throw new Error("Event not found");

    const workspace = await ctx.db.get(doc.workspaceId);
    if (!workspace) throw new Error("Event not found");

    await requireWorkspaceRole(ctx, workspace.externalId, ["owner", "admin"]);

    const now = Date.now();
    const reviewer = toReviewer(user);
    await ctx.db.patch(args.eventId, {
      redactionStatus: "blocked",
      safeForAudit: false,
      reviewedBy: reviewer,
      reviewedAt: now,
    });

    await recordEvidenceSafetyEvent(ctx, {
      workspaceId: doc.workspaceId,
      type: "evidence.event_blocked_from_audit",
      title: `Event blocked from audit: ${doc.title}`,
      actor: reviewer,
      importance: "high",
      data: { eventId: args.eventId },
    });

    return { success: true };
  },
});

export const markArtifactConfidential = mutation({
  args: { artifactId: v.id("artifacts") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.artifactId);
    if (!doc) throw new Error("Artifact not found");

    const workspace = await ctx.db.get(doc.workspaceId);
    if (!workspace) throw new Error("Artifact not found");

    await requireWorkspaceRole(ctx, workspace.externalId, ["owner", "admin"]);

    await ctx.db.patch(args.artifactId, {
      sensitivity: "confidential",
      safeForAudit: doc.safeForAudit === true ? false : doc.safeForAudit,
    });

    return { success: true };
  },
});

export const backfillSensitivity = mutation({
  args: {
    workspaceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);

    const limit = args.limit ?? 100;
    let artifactsScanned = 0;
    let eventsScanned = 0;
    let artifactsUpdated = 0;
    let eventsUpdated = 0;

    const artifacts = await ctx.db
      .query("artifacts")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .take(limit);

    for (const doc of artifacts) {
      artifactsScanned += 1;
      if (!doc.content) continue;
      const safety = applyArtifactSafety(doc.content);
      if (
        safety.sensitivity === doc.sensitivity &&
        safety.redactionStatus === doc.redactionStatus &&
        safety.safeForAudit === doc.safeForAudit
      ) {
        continue;
      }
      await ctx.db.patch(doc._id, {
        content: safety.content,
        sensitivity: safety.sensitivity,
        redactionStatus: safety.redactionStatus,
        safeForAudit: safety.safeForAudit,
        sensitiveFindings: safety.sensitiveFindings,
      });
      artifactsUpdated += 1;
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .take(limit);

    for (const doc of events) {
      eventsScanned += 1;
      const safety = applyEventSafety({
        title: doc.title,
        summary: doc.summary,
        entity: doc.entity,
        actor: doc.actor,
        data: doc.data,
      });
      if (
        safety.sensitivity === doc.sensitivity &&
        safety.redactionStatus === doc.redactionStatus &&
        safety.safeForAudit === doc.safeForAudit &&
        safety.title === doc.title &&
        safety.summary === doc.summary
      ) {
        continue;
      }
      await ctx.db.patch(doc._id, {
        title: safety.title,
        summary: safety.summary,
        sensitivity: safety.sensitivity,
        redactionStatus: safety.redactionStatus,
        safeForAudit: safety.safeForAudit,
        sensitiveFindings: safety.sensitiveFindings,
      });
      eventsUpdated += 1;
    }

    await recordEvidenceSafetyEvent(ctx, {
      workspaceId: workspace._id,
      type: "evidence.safety_backfill_completed",
      title: "Evidence safety backfill completed",
      summary: `Scanned ${artifactsScanned} artifacts and ${eventsScanned} events; updated ${artifactsUpdated} artifacts and ${eventsUpdated} events.`,
      actor: toReviewer(user),
      data: { artifactsScanned, eventsScanned, artifactsUpdated, eventsUpdated },
    });

    return { artifactsScanned, eventsScanned, artifactsUpdated, eventsUpdated };
  },
});
