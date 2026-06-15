import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { ContextPackItemType } from "../../src/types/context-packs";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type ContextPackInput = {
  workspaceId: Id<"workspaces">;
  projectId?: Id<"projects">;
  workstreamId?: Id<"workstreams">;
  viewId?: Id<"savedViews">;
  entityId?: Id<"entities">;
  playbookId?: Id<"playbooks">;
  lessonId?: Id<"lessons">;
  impactAnalysisId?: Id<"impactAnalyses">;
  title: string;
  goal: string;
  status: Doc<"contextPacks">["status"];
  requestedBy?: Doc<"contextPacks">["requestedBy"];
  request: Doc<"contextPacks">["request"];
  summary?: string;
  counts?: Doc<"contextPacks">["counts"];
};

export type ContextPackRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  workstreamId?: string;
  viewId?: string;
  entityId?: string;
  playbookId?: string;
  lessonId?: string;
  impactAnalysisId?: string;
  title: string;
  goal: string;
  status: Doc<"contextPacks">["status"];
  requestedBy?: Doc<"contextPacks">["requestedBy"];
  request: Doc<"contextPacks">["request"];
  summary?: string;
  counts?: NonNullable<Doc<"contextPacks">["counts"]>;
  createdAt: number;
  updatedAt: number;
};

export type ContextPackItemRecord = {
  id: string;
  workspaceId: string;
  contextPackId: string;
  itemType: ContextPackItemType;
  eventId?: string;
  workstreamId?: string;
  entityId?: string;
  impactAnalysisId?: string;
  lessonId?: string;
  playbookId?: string;
  insightFindingId?: string;
  artifactId?: string;
  title: string;
  summary?: string;
  reason?: string;
  importance?: Doc<"contextPackItems">["importance"];
  confidence?: Doc<"contextPackItems">["confidence"];
  order?: number;
  createdAt: number;
};

export type DraftContextPackItem = Omit<
  ContextPackItemRecord,
  "id" | "workspaceId" | "contextPackId" | "createdAt"
>;

export function docToContextPack(doc: Doc<"contextPacks">): ContextPackRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    workstreamId: doc.workstreamId,
    viewId: doc.viewId,
    entityId: doc.entityId,
    playbookId: doc.playbookId,
    lessonId: doc.lessonId,
    impactAnalysisId: doc.impactAnalysisId,
    title: doc.title,
    goal: doc.goal,
    status: doc.status,
    requestedBy: doc.requestedBy,
    request: doc.request,
    summary: doc.summary,
    counts: doc.counts ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function docToContextPackItem(doc: Doc<"contextPackItems">): ContextPackItemRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    contextPackId: doc.contextPackId,
    itemType: doc.itemType,
    eventId: doc.eventId,
    workstreamId: doc.workstreamId,
    entityId: doc.entityId,
    impactAnalysisId: doc.impactAnalysisId,
    lessonId: doc.lessonId,
    playbookId: doc.playbookId,
    insightFindingId: doc.insightFindingId,
    artifactId: doc.artifactId,
    title: doc.title,
    summary: doc.summary,
    reason: doc.reason,
    importance: doc.importance,
    confidence: doc.confidence,
    order: doc.order,
    createdAt: doc.createdAt,
  };
}

export async function createContextPackDoc(
  ctx: DbWriteCtx,
  input: ContextPackInput,
): Promise<Id<"contextPacks">> {
  const now = Date.now();
  return ctx.db.insert("contextPacks", {
    ...input,
    createdAt: now,
    updatedAt: now,
  });
}

export async function patchContextPackDoc(
  ctx: DbWriteCtx,
  packId: Id<"contextPacks">,
  patch: Partial<ContextPackInput>,
): Promise<void> {
  await ctx.db.patch(packId, { ...patch, updatedAt: Date.now() });
}

export async function listContextPacksForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  limit = 50,
): Promise<ContextPackRecord[]> {
  const docs = await ctx.db
    .query("contextPacks")
    .withIndex("by_workspace_created_at", (q) => q.eq("workspaceId", workspaceId))
    .order("desc")
    .take(limit);
  return docs.filter((doc) => doc.status !== "archived").map(docToContextPack);
}

export async function listContextPacksForProject(
  ctx: DbReadCtx,
  projectId: Id<"projects">,
  limit = 20,
): Promise<ContextPackRecord[]> {
  const docs = await ctx.db
    .query("contextPacks")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .order("desc")
    .take(limit);
  return docs.filter((doc) => doc.status !== "archived").map(docToContextPack);
}

export async function listContextPacksForWorkstream(
  ctx: DbReadCtx,
  workstreamId: Id<"workstreams">,
  limit = 20,
): Promise<ContextPackRecord[]> {
  const docs = await ctx.db
    .query("contextPacks")
    .withIndex("by_workstream", (q) => q.eq("workstreamId", workstreamId))
    .order("desc")
    .take(limit);
  return docs.filter((doc) => doc.status !== "archived").map(docToContextPack);
}

export async function listContextPacksForEntity(
  ctx: DbReadCtx,
  entityId: Id<"entities">,
  limit = 20,
): Promise<ContextPackRecord[]> {
  const docs = await ctx.db
    .query("contextPacks")
    .withIndex("by_entity", (q) => q.eq("entityId", entityId))
    .order("desc")
    .take(limit);
  return docs.filter((doc) => doc.status !== "archived").map(docToContextPack);
}

export async function listItemsForContextPack(
  ctx: DbReadCtx,
  contextPackId: Id<"contextPacks">,
): Promise<ContextPackItemRecord[]> {
  const docs = await ctx.db
    .query("contextPackItems")
    .withIndex("by_context_pack", (q) => q.eq("contextPackId", contextPackId))
    .collect();
  return docs
    .map(docToContextPackItem)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function replaceContextPackItems(
  ctx: DbWriteCtx,
  contextPackId: Id<"contextPacks">,
  workspaceId: Id<"workspaces">,
  items: DraftContextPackItem[],
): Promise<void> {
  const existing = await ctx.db
    .query("contextPackItems")
    .withIndex("by_context_pack", (q) => q.eq("contextPackId", contextPackId))
    .collect();
  for (const doc of existing) {
    await ctx.db.delete(doc._id);
  }
  const now = Date.now();
  for (const item of items) {
    await ctx.db.insert("contextPackItems", {
      workspaceId,
      contextPackId,
      itemType: item.itemType,
      eventId: item.eventId as Id<"events"> | undefined,
      workstreamId: item.workstreamId as Id<"workstreams"> | undefined,
      entityId: item.entityId as Id<"entities"> | undefined,
      impactAnalysisId: item.impactAnalysisId as Id<"impactAnalyses"> | undefined,
      lessonId: item.lessonId as Id<"lessons"> | undefined,
      playbookId: item.playbookId as Id<"playbooks"> | undefined,
      insightFindingId: item.insightFindingId as Id<"insightFindings"> | undefined,
      artifactId: item.artifactId as Id<"artifacts"> | undefined,
      title: item.title,
      summary: item.summary,
      reason: item.reason,
      importance: item.importance,
      confidence: item.confidence,
      order: item.order,
      createdAt: now,
    });
  }
}
