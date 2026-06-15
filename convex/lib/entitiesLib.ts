import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getMembershipAndAccessible, getWorkspaceMembership } from "./authz";
import { matchesVisibilityFilter } from "./eventDisplay";
import { docToEvent, type EventRecord } from "./eventsLib";
import {
  type AccessibleProjects,
  shouldHideEntity,
} from "./projectAccessLib";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type EntityType = Doc<"entities">["type"];

export type EntityCandidate = {
  type: EntityType;
  key: string;
  name: string;
  url?: string;
  source?: string;
  metadata?: unknown;
};

export type EntityRecord = {
  id: string;
  workspaceId: string;
  type: EntityType;
  key: string;
  name: string;
  url?: string;
  source?: string;
  eventCount: number;
  workstreamCount?: number;
  firstSeenAt: number;
  lastSeenAt: number;
  metadata?: unknown;
  createdAt: number;
  updatedAt: number;
};

export type ExtractableEvent = {
  source: string;
  category: string;
  type: string;
  actor: Doc<"events">["actor"];
  title?: string;
  entity?: Doc<"events">["entity"];
  data?: unknown;
};

const MAX_WORKSTREAM_IDS = 50;

/** Debug-level entity types hidden from the default Entities list. */
export const DEBUG_ENTITY_TYPES = new Set<EntityType>(["command"]);

export function isPrimaryEntityType(type: EntityType): boolean {
  return !DEBUG_ENTITY_TYPES.has(type);
}

function filterPrimaryEntityDocs(docs: Doc<"entities">[]): Doc<"entities">[] {
  return docs.filter((doc) => isPrimaryEntityType(doc.type));
}

function getEventData(event: ExtractableEvent): Record<string, unknown> {
  if (event.data && typeof event.data === "object" && !Array.isArray(event.data)) {
    return event.data as Record<string, unknown>;
  }
  return {};
}

export function normalizeEntityKey(type: EntityType, raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (type === "source") return trimmed.toLowerCase();
  if (type === "file") return trimmed.replace(/\\/g, "/");
  return trimmed;
}

function candidateKey(type: EntityType, key: string): string {
  return `${type}:${normalizeEntityKey(type, key)}`;
}

function addCandidate(
  map: Map<string, EntityCandidate>,
  candidate: EntityCandidate | null,
): void {
  if (!candidate || !candidate.key.trim()) return;
  const normalizedKey = normalizeEntityKey(candidate.type, candidate.key);
  const entry: EntityCandidate = {
    ...candidate,
    key: normalizedKey,
    name: candidate.name.trim() || normalizedKey,
  };
  map.set(candidateKey(entry.type, entry.key), entry);
}

export function buildGithubRepoNumberKey(
  repo: string,
  number: number,
  type: "pull_request" | "issue",
): string {
  return `${repo}#${number}`;
}

export function extractEntitiesFromEvent(event: ExtractableEvent): EntityCandidate[] {
  const map = new Map<string, EntityCandidate>();
  const data = getEventData(event);

  if (event.entity) {
    const entity = event.entity;
    let key = entity.id ?? entity.name;
    let name = entity.name ?? entity.id ?? "Unknown";

    if (
      (entity.type === "pull_request" || entity.type === "issue") &&
      typeof data.repo === "string" &&
      typeof data.number === "number"
    ) {
      key = buildGithubRepoNumberKey(data.repo, data.number, entity.type);
      if (!entity.name) {
        name =
          entity.type === "pull_request"
            ? `PR #${data.number}`
            : `Issue #${data.number}`;
      }
    }

    if (key) {
      addCandidate(map, {
        type: entity.type,
        key,
        name,
        url: entity.url,
        source:
          event.source === "github" ||
          event.source === "stripe" ||
          event.source === "posthog"
            ? event.source
            : undefined,
      });
    }
  }

  const actorKey = event.actor.id ?? event.actor.email ?? event.actor.name;
  if (actorKey) {
    addCandidate(map, {
      type: "actor",
      key: actorKey,
      name: event.actor.name ?? event.actor.email ?? event.actor.id ?? actorKey,
    });
  }

  if (event.actor.type === "customer" && event.actor.id) {
    addCandidate(map, {
      type: "customer",
      key: event.actor.id,
      name: event.actor.name ?? event.actor.id,
        source:
          event.source === "stripe" || event.source === "posthog"
            ? event.source
            : undefined,
    });
  }

  if (event.source) {
    addCandidate(map, {
      type: "source",
      key: event.source,
      name: event.source,
      source: event.source,
    });
  }

  if (typeof data.path === "string" && data.path.trim()) {
    const hasFileEntity =
      event.entity?.type === "file" &&
      (event.entity.name === data.path || event.entity.id === data.path);
    if (!hasFileEntity) {
      addCandidate(map, {
        type: "file",
        key: data.path,
        name: data.path,
      });
    }
  }

  if (event.type.startsWith("command.") && typeof data.command === "string" && data.command.trim()) {
    addCandidate(map, {
      type: "command",
      key: data.command,
      name: data.command,
      source: event.source,
    });
  }

  const customerId = data.customerId ?? data.userId;
  if (typeof customerId === "string" && customerId.trim()) {
    const entityType =
      event.actor.type === "customer" ? "customer" : "user";
    if (!map.has(candidateKey(entityType, customerId))) {
      addCandidate(map, {
        type: entityType,
        key: customerId,
        name: event.actor.name ?? customerId,
        source:
          event.source === "stripe" || event.source === "posthog"
            ? event.source
            : undefined,
      });
    }
  }

  if (event.source === "stripe") {
    const paymentId =
      (typeof data.paymentIntentId === "string" && data.paymentIntentId) ||
      (typeof data.sessionId === "string" && data.sessionId) ||
      (typeof data.chargeId === "string" && data.chargeId) ||
      (typeof data.invoiceId === "string" && data.invoiceId
        ? `invoice:${data.invoiceId}`
        : undefined);

    if (paymentId && !map.has(candidateKey("payment", paymentId))) {
      addCandidate(map, {
        type: "payment",
        key: paymentId,
        name: `Payment ${paymentId}`,
        url: typeof event.entity?.url === "string" ? event.entity.url : undefined,
        source: "stripe",
      });
    }

    const subscriptionId = data.subscriptionId;
    if (typeof subscriptionId === "string" && subscriptionId.trim()) {
      if (!map.has(candidateKey("subscription", subscriptionId))) {
        addCandidate(map, {
          type: "subscription",
          key: subscriptionId,
          name: `Subscription ${subscriptionId}`,
          source: "stripe",
        });
      }
    }
  }

  if (event.source === "posthog") {
    const distinctId =
      (typeof data.distinctId === "string" && data.distinctId) ||
      event.actor.id;
    if (distinctId && !map.has(candidateKey("user", distinctId))) {
      const email =
        typeof data.$email === "string"
          ? data.$email
          : typeof data.email === "string"
            ? data.email
            : undefined;
      addCandidate(map, {
        type: "user",
        key: distinctId,
        name: event.actor.name ?? email ?? distinctId,
        source: "posthog",
      });
    }

    const posthogCustomerId =
      (typeof data.customer_id === "string" && data.customer_id) ||
      (typeof data.customerId === "string" && data.customerId);
    if (posthogCustomerId && !map.has(candidateKey("customer", posthogCustomerId))) {
      addCandidate(map, {
        type: "customer",
        key: posthogCustomerId,
        name: event.actor.name ?? posthogCustomerId,
        source: "posthog",
      });
    }

    const featureKey =
      (typeof data.feature === "string" && data.feature) ||
      (typeof data.feature_key === "string" && data.feature_key) ||
      (typeof data.feature_name === "string" && data.feature_name) ||
      (typeof data.$pathname === "string" && data.$pathname) ||
      (typeof data.pathname === "string" && data.pathname);
    if (featureKey && !map.has(candidateKey("feature", featureKey))) {
      addCandidate(map, {
        type: "feature",
        key: featureKey,
        name: featureKey,
        source: "posthog",
      });
    }
  }

  return Array.from(map.values());
}

export function docToEntity(doc: Doc<"entities">): EntityRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    type: doc.type,
    key: doc.key,
    name: doc.name,
    url: doc.url,
    source: doc.source,
    eventCount: doc.eventCount,
    workstreamCount: doc.workstreamCount,
    firstSeenAt: doc.firstSeenAt,
    lastSeenAt: doc.lastSeenAt,
    metadata: doc.metadata,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function upsertEntityFromCandidate(
  ctx: DbWriteCtx,
  workspaceId: Id<"workspaces">,
  candidate: EntityCandidate,
  occurredAt: number,
  workstreamId?: Id<"workstreams">,
): Promise<Id<"entities">> {
  const key = normalizeEntityKey(candidate.type, candidate.key);
  const now = Date.now();

  const existing = await ctx.db
    .query("entities")
    .withIndex("by_workspace_type_key", (q) =>
      q.eq("workspaceId", workspaceId).eq("type", candidate.type).eq("key", key),
    )
    .first();

  if (existing) {
    const metadata = (existing.metadata ?? {}) as Record<string, unknown>;
    let workstreamCount = existing.workstreamCount ?? 0;
    const workstreamIds = new Set<string>(
      Array.isArray(metadata.workstreamIds)
        ? (metadata.workstreamIds as string[])
        : [],
    );

    if (workstreamId && !workstreamIds.has(workstreamId)) {
      workstreamIds.add(workstreamId);
      workstreamCount = workstreamIds.size;
    }

    const nextMetadata = {
      ...metadata,
      workstreamIds: Array.from(workstreamIds).slice(-MAX_WORKSTREAM_IDS),
    };

    await ctx.db.patch(existing._id, {
      name: candidate.name || existing.name,
      url: candidate.url ?? existing.url,
      source: candidate.source ?? existing.source,
      eventCount: existing.eventCount + 1,
      workstreamCount,
      lastSeenAt: occurredAt,
      updatedAt: now,
      metadata: nextMetadata,
    });
    return existing._id;
  }

  const workstreamIds = workstreamId ? [workstreamId] : [];
  return ctx.db.insert("entities", {
    workspaceId,
    type: candidate.type,
    key,
    name: candidate.name,
    url: candidate.url,
    source: candidate.source,
    eventCount: 1,
    workstreamCount: workstreamIds.length,
    firstSeenAt: occurredAt,
    lastSeenAt: occurredAt,
    metadata: workstreamIds.length > 0 ? { workstreamIds } : candidate.metadata,
    createdAt: now,
    updatedAt: now,
  });
}

export async function upsertEntitiesFromEvent(
  ctx: DbWriteCtx,
  workspaceId: Id<"workspaces">,
  event: ExtractableEvent,
  occurredAt: number,
  workstreamId?: Id<"workstreams">,
): Promise<void> {
  const candidates = extractEntitiesFromEvent(event);
  for (const candidate of candidates) {
    try {
      await upsertEntityFromCandidate(ctx, workspaceId, candidate, occurredAt, workstreamId);
    } catch {
      // Do not block event insert on entity upsert failure.
    }
  }
}

function githubRepoNumberFromEvent(event: EventRecord | ExtractableEvent): string | null {
  const data = getEventData(event);
  const repo = data.repo;
  const number = data.number;
  if (typeof repo !== "string" || typeof number !== "number") return null;
  if (event.entity?.type === "pull_request" || event.entity?.type === "issue") {
    return buildGithubRepoNumberKey(repo, number, event.entity.type);
  }
  return null;
}

export function eventMatchesEntity(
  event: EventRecord | ExtractableEvent,
  entity: EntityRecord | Doc<"entities">,
): boolean {
  const normalizedKey = normalizeEntityKey(entity.type, entity.key);

  switch (entity.type) {
    case "file": {
      const path =
        event.entity?.type === "file"
          ? (event.entity.name ?? event.entity.id)
          : null;
      const dataPath = getEventData(event).path;
      if (path && normalizeEntityKey("file", path) === normalizedKey) return true;
      if (typeof dataPath === "string" && normalizeEntityKey("file", dataPath) === normalizedKey) {
        return true;
      }
      return false;
    }
    case "pull_request":
    case "issue": {
      const repoKey = githubRepoNumberFromEvent(event);
      if (repoKey && normalizeEntityKey(entity.type, repoKey) === normalizedKey) return true;
      if (event.entity?.type === entity.type) {
        const entityKey = event.entity.id ?? event.entity.name;
        if (entityKey && normalizeEntityKey(entity.type, entityKey) === normalizedKey) return true;
      }
      return false;
    }
    case "actor": {
      const actor = event.actor;
      const keys = [actor.id, actor.email, actor.name].filter(Boolean) as string[];
      return keys.some((k) => normalizeEntityKey("actor", k) === normalizedKey);
    }
    case "source":
      return event.source === normalizedKey;
    case "customer":
    case "user": {
      const data = getEventData(event);
      const ids = [
        event.actor.id,
        event.entity?.id,
        data.customerId,
        data.userId,
      ].filter((v): v is string => typeof v === "string");
      return ids.some((id) => normalizeEntityKey(entity.type, id) === normalizedKey);
    }
    case "payment":
    case "subscription": {
      return (
        event.entity?.type === entity.type &&
        !!event.entity.id &&
        normalizeEntityKey(entity.type, event.entity.id) === normalizedKey
      );
    }
    case "command": {
      const command = getEventData(event).command;
      return (
        typeof command === "string" &&
        normalizeEntityKey("command", command) === normalizedKey
      );
    }
    default: {
      if (event.entity?.type !== entity.type) return false;
      const entityKey = event.entity.id ?? event.entity.name;
      return !!entityKey && normalizeEntityKey(entity.type, entityKey) === normalizedKey;
    }
  }
}

export async function listEntitiesForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  options: { type?: EntityType; limit?: number; includeDebug?: boolean } = {},
): Promise<EntityRecord[]> {
  const limit = options.limit ?? 100;
  const includeDebug = options.includeDebug ?? false;
  const scanLimit = Math.max(limit * 5, 300);

  if (options.type) {
    const docs = await ctx.db
      .query("entities")
      .withIndex("by_workspace_type", (q) =>
        q.eq("workspaceId", workspaceId).eq("type", options.type!),
      )
      .order("desc")
      .take(limit);
    return docs
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
      .slice(0, limit)
      .map(docToEntity);
  }

  const docs = await ctx.db
    .query("entities")
    .withIndex("by_workspace_last_seen", (q) => q.eq("workspaceId", workspaceId))
    .order("desc")
    .take(scanLimit);

  const filtered = includeDebug ? docs : filterPrimaryEntityDocs(docs);

  return filtered.slice(0, limit).map(docToEntity);
}

export async function searchEntitiesForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  options: {
    query: string;
    type?: EntityType;
    limit?: number;
    includeDebug?: boolean;
  },
): Promise<EntityRecord[]> {
  const limit = options.limit ?? 20;
  const includeDebug = options.includeDebug ?? false;
  const normalizedQuery = options.query.trim().toLowerCase();
  if (!normalizedQuery) {
    return listEntitiesForWorkspace(ctx, workspaceId, {
      type: options.type,
      limit,
      includeDebug,
    });
  }

  let docs = await ctx.db
    .query("entities")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  if (options.type) {
    docs = docs.filter((doc) => doc.type === options.type);
  } else if (!includeDebug) {
    docs = filterPrimaryEntityDocs(docs);
  }

  return docs
    .filter((doc) => {
      const haystack = [
        doc.name,
        doc.key,
        doc.type,
        doc.source,
        doc.url,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
    .slice(0, limit)
    .map(docToEntity);
}

export async function getEntityTimelineEvents(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  entity: EntityRecord | Doc<"entities">,
  options: {
    limit?: number;
    scanLimit?: number;
    visibility?: "primary" | "all";
  } = {},
): Promise<EventRecord[]> {
  const limit = options.limit ?? 100;
  const scanLimit = options.scanLimit ?? 500;
  const visibility = options.visibility ?? "primary";

  const docs = await ctx.db
    .query("events")
    .withIndex("by_workspace_occurred_at", (q) => q.eq("workspaceId", workspaceId))
    .order("desc")
    .take(scanLimit);

  const entityRecord = "_id" in entity ? docToEntity(entity) : entity;

  return docs
    .filter((doc) => {
      if (!eventMatchesEntity(docToEvent(doc), entityRecord)) return false;
      const mode = visibility === "all" ? "all" : "primary";
      return matchesVisibilityFilter(doc, mode, { includeDebug: visibility === "all" });
    })
    .slice(0, limit)
    .map(docToEvent);
}

export async function getRelatedWorkstreamsForEntity(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  entity: EntityRecord | Doc<"entities">,
  limit = 10,
): Promise<Id<"workstreams">[]> {
  const events = await getEntityTimelineEvents(ctx, workspaceId, entity, {
    limit: 200,
    visibility: "all",
  });

  const workstreamIds = new Set<Id<"workstreams">>();
  for (const event of events) {
    if (event.workstreamId) {
      workstreamIds.add(event.workstreamId as Id<"workstreams">);
    }
    if (workstreamIds.size >= limit) break;
  }
  return Array.from(workstreamIds).slice(0, limit);
}

export async function assertEntityAccess(
  ctx: DbReadCtx,
  entityId: Id<"entities">,
  userId: string,
): Promise<Doc<"entities">> {
  const entity = await ctx.db.get(entityId);
  if (!entity) throw new Error("Entity not found");
  const workspace = await ctx.db.get(entity.workspaceId);
  if (!workspace) throw new Error("Entity not found");
  const membership = await getWorkspaceMembership(ctx, entity.workspaceId, userId);
  if (!membership) throw new Error("Entity not found");
  return entity;
}

export async function assertEntityVisible(
  ctx: DbReadCtx,
  entityId: Id<"entities">,
  userId: string,
): Promise<Doc<"entities">> {
  const entity = await assertEntityAccess(ctx, entityId, userId);
  const { accessible } = await getMembershipAndAccessible(ctx, entity.workspaceId, userId);
  if (accessible === "all") {
    return entity;
  }

  const events = await getEntityTimelineEvents(ctx, entity.workspaceId, entity, {
    limit: 100,
    visibility: "all",
  });
  const projectIds = events.map((event) => event.projectId as Id<"projects"> | undefined);
  if (shouldHideEntity(projectIds, accessible)) {
    throw new Error("Entity not found");
  }
  return entity;
}

export async function filterEntityRecordsByProjectAccess(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  entities: EntityRecord[],
  accessible: AccessibleProjects,
): Promise<EntityRecord[]> {
  if (accessible === "all" || entities.length === 0) {
    return entities;
  }

  const scanLimit = Math.max(entities.length * 20, 500);
  const docs = await ctx.db
    .query("events")
    .withIndex("by_workspace_occurred_at", (q) => q.eq("workspaceId", workspaceId))
    .order("desc")
    .take(scanLimit);

  const projectIdsByEntity = new Map<string, Id<"projects">[]>();

  for (const doc of docs) {
    const event = docToEvent(doc);
    const projectId = doc.projectId as Id<"projects"> | undefined;
    for (const entity of entities) {
      if (!eventMatchesEntity(event, entity)) {
        continue;
      }
      const existing = projectIdsByEntity.get(entity.id) ?? [];
      if (projectId) {
        existing.push(projectId);
      }
      projectIdsByEntity.set(entity.id, existing);
    }
  }

  return entities.filter((entity) => {
    const projectIds = projectIdsByEntity.get(entity.id) ?? [];
    return !shouldHideEntity(projectIds, accessible);
  });
}

export async function backfillEntitiesForWorkspace(
  ctx: DbWriteCtx,
  workspaceId: Id<"workspaces">,
  limit = 500,
): Promise<{ created: number; updated: number; processed: number }> {
  const docs = await ctx.db
    .query("events")
    .withIndex("by_workspace_occurred_at", (q) => q.eq("workspaceId", workspaceId))
    .order("desc")
    .take(limit);

  let processed = 0;

  for (const doc of docs) {
    await upsertEntitiesFromEvent(
      ctx,
      workspaceId,
      {
        source: doc.source,
        category: doc.category,
        type: doc.type,
        actor: doc.actor,
        title: doc.title,
        entity: doc.entity,
        data: doc.data,
      },
      doc.occurredAt,
      doc.workstreamId,
    );
    processed += 1;
  }

  const entities = await ctx.db
    .query("entities")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  return { created: entities.length, updated: processed, processed };
}
