import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { canViewWorkstream, getWorkspaceMembership } from "./authz";
import { getAccessibleProjectIds, type AccessibleProjects } from "./projectAccessLib";
import type { WorkstreamStatus } from "./eventTypes";
import { buildWorkstreamSearchText } from "./search";

export type WorkstreamRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  title: string;
  summary?: string;
  status: WorkstreamStatus;
  createdBy?: Doc<"workstreams">["createdBy"];
  startedAt: number;
  endedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type WorkstreamListSummary = WorkstreamRecord & {
  eventCount: number;
  artifactCount: number;
  decisionCount: number;
  incidentCount: number;
  lastActivityAt?: number;
  sourceLabel?: string;
};

type DbReadCtx = Pick<QueryCtx, "db">;

type ListWorkstreamsOptions = {
  status?: WorkstreamStatus;
  projectId?: Id<"projects">;
  limit?: number;
  accessibleProjects?: AccessibleProjects;
};

export function docToWorkstream(doc: Doc<"workstreams">): WorkstreamRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    title: doc.title,
    summary: doc.summary,
    status: doc.status,
    createdBy: doc.createdBy,
    startedAt: doc.startedAt,
    endedAt: doc.endedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function listWorkstreamsForWorkspace(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  options: ListWorkstreamsOptions = {},
): Promise<WorkstreamRecord[]> {
  const limit = options.limit ?? 50;
  const { status, projectId } = options;

  let docs: Doc<"workstreams">[];

  if (projectId) {
    docs = await ctx.db
      .query("workstreams")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    if (status) {
      docs = docs.filter((doc) => doc.status === status);
    }
  } else if (status) {
    docs = await ctx.db
      .query("workstreams")
      .withIndex("by_workspace_status", (q) =>
        q.eq("workspaceId", workspaceDocId).eq("status", status),
      )
      .collect();
  } else {
    docs = await ctx.db
      .query("workstreams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceDocId))
      .collect();
  }

  let records = docs
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit)
    .map(docToWorkstream);

  if (options.accessibleProjects) {
    records = records.filter((workstream) =>
      canViewWorkstream(workstream, options.accessibleProjects!),
    );
  }

  return records;
}

async function enrichWorkstreamSummary(
  ctx: DbReadCtx,
  record: WorkstreamRecord,
): Promise<WorkstreamListSummary> {
  const workstreamId = record.id as Id<"workstreams">;

  const events = await ctx.db
    .query("events")
    .withIndex("by_workstream", (q) => q.eq("workstreamId", workstreamId))
    .collect();

  const artifacts = await ctx.db
    .query("artifacts")
    .withIndex("by_workstream", (q) => q.eq("workstreamId", workstreamId))
    .collect();

  const decisions = await ctx.db
    .query("decisions")
    .withIndex("by_workstream", (q) => q.eq("workstreamId", workstreamId))
    .collect();

  const incidentsAll = await ctx.db
    .query("incidents")
    .withIndex("by_workspace", (q) =>
      q.eq("workspaceId", record.workspaceId as Id<"workspaces">),
    )
    .collect();
  const incidents = incidentsAll.filter((i) => i.workstreamId === workstreamId);

  const lastEventAt = events.reduce(
    (max, e) => Math.max(max, e.occurredAt ?? 0),
    0,
  );
  const lastActivityAt = lastEventAt > 0 ? lastEventAt : record.updatedAt;

  const sourceLabel =
    events.length > 0
      ? [...new Set(events.map((e) => e.source))].slice(0, 2).join(" · ")
      : record.createdBy?.type === "agent"
        ? "Cursor Agent"
        : record.createdBy?.type === "human"
          ? "CLI"
          : undefined;

  return {
    ...record,
    eventCount: events.length,
    artifactCount: artifacts.length,
    decisionCount: decisions.length,
    incidentCount: incidents.length,
    lastActivityAt,
    sourceLabel,
  };
}

export async function listWorkstreamSummariesForWorkspace(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  options: ListWorkstreamsOptions = {},
): Promise<WorkstreamListSummary[]> {
  const records = await listWorkstreamsForWorkspace(ctx, workspaceDocId, options);
  return Promise.all(records.map((record) => enrichWorkstreamSummary(ctx, record)));
}

type SearchWorkstreamsOptions = {
  query: string;
  limit?: number;
  scanLimit?: number;
  status?: WorkstreamStatus;
  projectId?: Id<"projects">;
  accessibleProjects?: AccessibleProjects;
};

export async function searchWorkstreamsForWorkspace(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  options: SearchWorkstreamsOptions,
): Promise<WorkstreamRecord[]> {
  const limit = options.limit ?? 20;
  const scanLimit = options.scanLimit ?? 100;
  const normalizedQuery = options.query.trim().toLowerCase();

  if (!normalizedQuery) {
    return listWorkstreamsForWorkspace(ctx, workspaceDocId, {
      limit,
      status: options.status,
      projectId: options.projectId,
      accessibleProjects: options.accessibleProjects,
    });
  }

  let docs: Doc<"workstreams">[];

  if (options.projectId) {
    docs = await ctx.db
      .query("workstreams")
      .withIndex("by_project", (q) => q.eq("projectId", options.projectId!))
      .collect();
  } else {
    docs = await ctx.db
      .query("workstreams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceDocId))
      .collect();
  }

  if (options.status) {
    docs = docs.filter((doc) => doc.status === options.status);
  }

  return docs
    .filter((doc) => {
      const searchText =
        doc.searchText ??
        buildWorkstreamSearchText({
          title: doc.title,
          summary: doc.summary,
          status: doc.status,
          createdBy: doc.createdBy,
        });
      return searchText.includes(normalizedQuery);
    })
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, Math.min(limit, scanLimit))
    .map(docToWorkstream);
}

export async function assertWorkstreamAccess(
  ctx: DbReadCtx,
  workstreamId: Id<"workstreams">,
  userId: string,
): Promise<Doc<"workstreams">> {
  const workstream = await ctx.db.get(workstreamId);
  if (!workstream) {
    throw new Error("Workstream not found");
  }
  const workspace = await ctx.db.get(workstream.workspaceId);
  if (!workspace) {
    throw new Error("Workstream not found");
  }
  const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
  if (!membership) {
    throw new Error("Workstream not found");
  }
  if (membership.role === "auditor") {
    throw new Error("Workstream not found");
  }
  const accessible = await getAccessibleProjectIds(ctx, workspace._id, membership);
  if (!canViewWorkstream(workstream, accessible)) {
    throw new Error("Workstream not found");
  }
  return workstream;
}
