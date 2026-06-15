import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  matchesVisibilityFilter,
  resolveEventDisplayFields,
  type EventImportance,
  type EventVisibility,
  type VisibilityFilterMode,
} from "./eventDisplay";
import { upsertEntitiesFromEvent } from "./entitiesLib";
import { bumpProjectActivity } from "./projectsLib";
import type { EventCategory, EventSource } from "./eventTypes";
import { buildEventSearchText } from "./search";
import { getWorkspaceDocByExternalId } from "./workspacesLib";
import {
  canViewEvent,
  canWriteWorkspaceData,
  getWorkspaceMembership,
  assertNotAuditorWorkspaceBrowse,
} from "./authz";
import {
  getActiveAccessForProjectMember,
  getAccessibleProjectIds,
  resolveProjectAccessLevel,
  type AccessibleProjects,
} from "./projectAccessLib";
import { canWriteProjectData } from "../../src/types/project-access";
import { applyEventSafety, recordEvidenceSafetyEvent } from "./sensitiveContent";

export type InsertEventInput = {
  workspaceId: Id<"workspaces">;
  source: EventSource;
  category: EventCategory;
  type: string;
  actor: Doc<"events">["actor"];
  title: string;
  projectId?: Id<"projects">;
  workstreamId?: Id<"workstreams">;
  sourceId?: Id<"sources">;
  summary?: string;
  entity?: Doc<"events">["entity"];
  artifactIds?: Id<"artifacts">[];
  data?: unknown;
  severity?: Doc<"events">["severity"];
  tags?: string[];
  occurredAt?: number;
  importance?: EventImportance;
  visibility?: EventVisibility;
  displayReason?: string;
  isUserPinned?: boolean;
  isUserHidden?: boolean;
};

type DbWriteCtx = Pick<MutationCtx, "db">;

export type EventRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  workstreamId?: string;
  sourceId?: string;
  source: EventSource;
  category: EventCategory;
  type: string;
  actor: Doc<"events">["actor"];
  title: string;
  summary?: string;
  entity?: Doc<"events">["entity"];
  artifactIds?: string[];
  data?: unknown;
  severity?: Doc<"events">["severity"];
  tags?: string[];
  importance?: EventImportance;
  visibility?: EventVisibility;
  displayReason?: string;
  isUserPinned?: boolean;
  isUserHidden?: boolean;
  sensitivity?: Doc<"events">["sensitivity"];
  redactionStatus?: Doc<"events">["redactionStatus"];
  safeForAudit?: boolean;
  sensitiveFindings?: Doc<"events">["sensitiveFindings"];
  reviewedBy?: Doc<"events">["reviewedBy"];
  reviewedAt?: Doc<"events">["reviewedAt"];
  occurredAt: number;
  createdAt: number;
};

type DbReadCtx = Pick<QueryCtx, "db">;

type ListEventsOptions = {
  limit?: number;
  category?: EventCategory;
  source?: EventSource;
  projectId?: Id<"projects">;
  visibility?: VisibilityFilterMode;
  includeHidden?: boolean;
  includeDebug?: boolean;
  scanLimit?: number;
  accessibleProjects?: AccessibleProjects;
};

export async function assertWorkspaceAccess(
  ctx: DbReadCtx,
  externalId: string,
  userId: string,
): Promise<Doc<"workspaces">> {
  const workspace = await getWorkspaceDocByExternalId(ctx, externalId);
  const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
  if (!membership) {
    throw new Error("Workspace not found");
  }
  return workspace;
}

/** Workspace access for normal app surfaces (blocks external auditors). */
export async function assertWorkspaceBrowseAccess(
  ctx: DbReadCtx,
  externalId: string,
  userId: string,
): Promise<Doc<"workspaces">> {
  const workspace = await assertWorkspaceAccess(ctx, externalId, userId);
  const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
  if (membership) {
    assertNotAuditorWorkspaceBrowse(membership);
  }
  return workspace;
}

export function docToEvent(doc: Doc<"events">): EventRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    workstreamId: doc.workstreamId,
    sourceId: doc.sourceId,
    source: doc.source,
    category: doc.category,
    type: doc.type,
    actor: doc.actor,
    title: doc.title,
    summary: doc.summary,
    entity: doc.entity,
    artifactIds: doc.artifactIds,
    data: doc.data,
    severity: doc.severity,
    tags: doc.tags,
    importance: doc.importance,
    visibility: doc.visibility,
    displayReason: doc.displayReason,
    isUserPinned: doc.isUserPinned,
    isUserHidden: doc.isUserHidden,
    sensitivity: doc.sensitivity,
    redactionStatus: doc.redactionStatus,
    safeForAudit: doc.safeForAudit,
    sensitiveFindings: doc.sensitiveFindings,
    reviewedBy: doc.reviewedBy,
    reviewedAt: doc.reviewedAt,
    occurredAt: doc.occurredAt,
    createdAt: doc.createdAt,
  };
}

export async function listEventsForWorkspace(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  options: ListEventsOptions = {},
): Promise<EventRecord[]> {
  const limit = options.limit ?? 50;
  const visibility = options.visibility ?? "primary";
  const scanLimit = options.scanLimit ?? 500;
  const { category, source } = options;

  const filterDoc = (doc: Doc<"events">) => {
    if (options.projectId && doc.projectId !== options.projectId) return false;
    if (category && doc.category !== category) return false;
    if (source && doc.source !== source) return false;
    return matchesVisibilityFilter(doc, visibility, {
      includeHidden: options.includeHidden,
      includeDebug: options.includeDebug,
    });
  };

  const collectFiltered = (docs: Doc<"events">[]) => {
    let events = docs.filter(filterDoc).map(docToEvent);
    if (options.accessibleProjects) {
      events = events.filter((event) =>
        canViewEvent(event, options.accessibleProjects!),
      );
    }
    return events.slice(0, limit);
  };

  if (options.projectId) {
    const docs = await ctx.db
      .query("events")
      .withIndex("by_project", (q) => q.eq("projectId", options.projectId!))
      .order("desc")
      .take(scanLimit);
    return collectFiltered(docs);
  }

  if (category) {
    const docs = await ctx.db
      .query("events")
      .withIndex("by_category", (q) =>
        q.eq("workspaceId", workspaceDocId).eq("category", category),
      )
      .order("desc")
      .take(scanLimit);
    return collectFiltered(docs);
  }

  if (source) {
    const docs = await ctx.db
      .query("events")
      .withIndex("by_source", (q) =>
        q.eq("workspaceId", workspaceDocId).eq("source", source),
      )
      .order("desc")
      .take(scanLimit);
    return collectFiltered(docs);
  }

  const docs = await ctx.db
    .query("events")
    .withIndex("by_workspace_occurred_at", (q) =>
      q.eq("workspaceId", workspaceDocId),
    )
    .order("desc")
    .take(scanLimit);

  return collectFiltered(docs);
}

type SearchEventsOptions = {
  query: string;
  limit?: number;
  scanLimit?: number;
  category?: EventCategory;
  source?: EventSource;
  projectId?: Id<"projects">;
  includeDebug?: boolean;
  includeHidden?: boolean;
  accessibleProjects?: AccessibleProjects;
};

export async function searchEventsForWorkspace(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  options: SearchEventsOptions,
): Promise<EventRecord[]> {
  const limit = options.limit ?? 50;
  const scanLimit = options.scanLimit ?? 500;
  const normalizedQuery = options.query.trim().toLowerCase();

  if (!normalizedQuery) {
    return listEventsForWorkspace(ctx, workspaceDocId, {
      limit,
      category: options.category,
      source: options.source,
      projectId: options.projectId,
      visibility: "all",
      includeDebug: options.includeDebug ?? true,
      includeHidden: options.includeHidden ?? false,
      accessibleProjects: options.accessibleProjects,
    });
  }

  let docs: Doc<"events">[];

  if (options.projectId) {
    docs = await ctx.db
      .query("events")
      .withIndex("by_project", (q) => q.eq("projectId", options.projectId!))
      .order("desc")
      .take(scanLimit);
  } else {
    docs = await ctx.db
      .query("events")
      .withIndex("by_workspace_occurred_at", (q) =>
        q.eq("workspaceId", workspaceDocId),
      )
      .order("desc")
      .take(scanLimit);
  }

  if (options.category) {
    docs = docs.filter((doc) => doc.category === options.category);
  }
  if (options.source) {
    docs = docs.filter((doc) => doc.source === options.source);
  }

  let events = docs
    .filter((doc) => {
      if (!matchesVisibilityFilter(doc, "all", {
        includeDebug: options.includeDebug ?? true,
        includeHidden: options.includeHidden ?? false,
      })) {
        return false;
      }
      const searchText =
        doc.searchText ??
        buildEventSearchText({
          title: doc.title,
          summary: doc.summary,
          type: doc.type,
          category: doc.category,
          source: doc.source,
          actor: doc.actor,
          entity: doc.entity,
          tags: doc.tags,
        });
      return searchText.includes(normalizedQuery);
    })
    .slice(0, limit)
    .map(docToEvent);

  if (options.accessibleProjects) {
    events = events.filter((event) => canViewEvent(event, options.accessibleProjects!));
  }

  return events;
}

export async function listEventsByWorkstream(
  ctx: DbReadCtx,
  workstreamId: Id<"workstreams">,
  options: { limit?: number } = {},
): Promise<EventRecord[]> {
  const limit = options.limit ?? 100;
  const docs = await ctx.db
    .query("events")
    .withIndex("by_workstream", (q) => q.eq("workstreamId", workstreamId))
    .order("asc")
    .take(limit);

  return docs.map(docToEvent);
}

export async function assertEventAccess(
  ctx: DbReadCtx,
  eventId: Id<"events">,
  userId: string,
): Promise<Doc<"events">> {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new Error("Event not found");
  }
  const workspace = await ctx.db.get(event.workspaceId);
  if (!workspace) {
    throw new Error("Event not found");
  }
  const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
  if (!membership) {
    throw new Error("Event not found");
  }
  const accessible = await getAccessibleProjectIds(ctx, workspace._id, membership);
  if (!canViewEvent(event, accessible)) {
    throw new Error("Event not found");
  }
  return event;
}

export async function assertEventWriteAccess(
  ctx: DbReadCtx,
  eventId: Id<"events">,
  userId: string,
): Promise<Doc<"events">> {
  const event = await assertEventAccess(ctx, eventId, userId);
  const membership = await getWorkspaceMembership(ctx, event.workspaceId, userId);
  if (!membership || !canWriteWorkspaceData(membership.role)) {
    throw new Error("Insufficient permissions");
  }
  if (event.projectId) {
    const accessRow = await getActiveAccessForProjectMember(
      ctx,
      event.projectId,
      membership._id,
    );
    const level = resolveProjectAccessLevel(membership.role, accessRow);
    if (!level || !canWriteProjectData(level)) {
      throw new Error("Insufficient permissions");
    }
  }
  return event;
}

export async function insertEvent(
  ctx: DbWriteCtx,
  input: InsertEventInput,
): Promise<Id<"events">> {
  const now = Date.now();

  const safety = applyEventSafety({
    title: input.title,
    summary: input.summary,
    entity: input.entity,
    actor: input.actor,
    data: input.data,
  });

  const searchText = buildEventSearchText({
    title: safety.title,
    summary: safety.summary,
    type: input.type,
    category: input.category,
    source: input.source,
    actor: input.actor,
    entity: safety.entity,
    tags: input.tags,
    data:
      typeof safety.data === "object" && safety.data !== null
        ? (safety.data as Record<string, unknown>)
        : undefined,
  });

  const displayFields = resolveEventDisplayFields({
    source: input.source,
    category: input.category,
    type: input.type,
    title: safety.title,
    summary: safety.summary,
    severity: input.severity,
    workstreamId: input.workstreamId,
    entity: safety.entity,
    data: safety.data,
    isUserPinned: input.isUserPinned,
    isUserHidden: input.isUserHidden,
    importance: input.importance,
    visibility: input.visibility,
    displayReason: input.displayReason,
  });

  let projectId = input.projectId;
  if (!projectId && input.workstreamId) {
    const workstream = await ctx.db.get(input.workstreamId);
    if (workstream?.projectId) {
      projectId = workstream.projectId;
    }
  }

  const eventId = await ctx.db.insert("events", {
    workspaceId: input.workspaceId,
    projectId,
    workstreamId: input.workstreamId,
    sourceId: input.sourceId,
    source: input.source,
    category: input.category,
    type: input.type,
    actor: input.actor,
    title: safety.title,
    summary: safety.summary,
    entity: safety.entity,
    artifactIds: input.artifactIds,
    data: safety.data,
    severity: input.severity,
    tags: input.tags,
    importance: displayFields.importance,
    visibility: displayFields.visibility,
    displayReason: displayFields.displayReason,
    isUserPinned: input.isUserPinned,
    isUserHidden: input.isUserHidden,
    searchText,
    sensitivity: safety.sensitivity,
    redactionStatus: safety.redactionStatus,
    safeForAudit: safety.safeForAudit,
    sensitiveFindings: safety.sensitiveFindings,
    occurredAt: input.occurredAt ?? now,
    createdAt: now,
  });

  if (safety.sensitiveFindings?.length) {
    await recordEvidenceSafetyEvent(ctx, {
      workspaceId: input.workspaceId,
      type: "evidence.sensitive_content_detected",
      title: `Sensitive content detected in event: ${safety.title}`,
      summary: `${safety.sensitiveFindings.length} finding(s) in event fields.`,
      importance: safety.sensitivity === "restricted" ? "high" : "normal",
      data: { eventId, findings: safety.sensitiveFindings },
    });
  }

  await upsertEntitiesFromEvent(
    ctx,
    input.workspaceId,
    {
      source: input.source,
      category: input.category,
      type: input.type,
      actor: input.actor,
      title: input.title,
      entity: input.entity,
      data: input.data,
    },
    input.occurredAt ?? now,
    input.workstreamId,
  );

  if (projectId) {
    await bumpProjectActivity(ctx, projectId, input.occurredAt ?? now);
  }

  return eventId;
}
