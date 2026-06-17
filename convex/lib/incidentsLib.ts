import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { filterIncidentsByAccess } from "./incidentPermissions";
import { recordIncidentTimelineEvent } from "./incidentTimeline";
import type { AccessibleProjects } from "./projectAccessLib";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

const TERMINAL_STATUSES = new Set<Doc<"incidents">["status"]>([
  "resolved",
  "rolled_back",
  "archived",
]);

export type IncidentRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  workstreamId?: string;
  title: string;
  summary?: string;
  status: Doc<"incidents">["status"];
  severity: Doc<"incidents">["severity"];
  source: Doc<"incidents">["source"];
  service?: string;
  environment?: string;
  startedAt: number;
  resolvedAt?: number;
  rootCause?: string;
  mitigation?: string;
  rollbackSummary?: string;
  sourceRef?: Doc<"incidents">["sourceRef"];
  linkedSignalIds?: string[];
  linkedEventIds?: string[];
  linkedWorkstreamIds?: string[];
  linkedDecisionIds?: string[];
  linkedRollbackIds?: string[];
  linkedArtifactIds?: string[];
  createdAt: number;
  updatedAt: number;
};

export function docToIncident(doc: Doc<"incidents">): IncidentRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    workstreamId: doc.workstreamId,
    title: doc.title,
    summary: doc.summary,
    status: doc.status,
    severity: doc.severity,
    source: doc.source,
    service: doc.service,
    environment: doc.environment,
    startedAt: doc.startedAt,
    resolvedAt: doc.resolvedAt,
    rootCause: doc.rootCause,
    mitigation: doc.mitigation,
    rollbackSummary: doc.rollbackSummary,
    sourceRef: doc.sourceRef,
    linkedSignalIds: doc.linkedSignalIds,
    linkedEventIds: doc.linkedEventIds,
    linkedWorkstreamIds: doc.linkedWorkstreamIds,
    linkedDecisionIds: doc.linkedDecisionIds,
    linkedRollbackIds: doc.linkedRollbackIds,
    linkedArtifactIds: doc.linkedArtifactIds,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type CreateIncidentInput = {
  workspaceId: Id<"workspaces">;
  projectId?: Id<"projects">;
  workstreamId?: Id<"workstreams">;
  title: string;
  summary?: string;
  status?: Doc<"incidents">["status"];
  severity: Doc<"incidents">["severity"];
  source: Doc<"incidents">["source"];
  service?: string;
  environment?: string;
  startedAt?: number;
  sourceRef?: Doc<"incidents">["sourceRef"];
  skipDedup?: boolean;
  skipTimelineEvent?: boolean;
};

export async function findIncidentByDedupKey(
  ctx: DbReadCtx,
  input: {
    workspaceId: Id<"workspaces">;
    source: Doc<"incidents">["source"];
    sourceIncidentId?: string;
    service?: string;
    fingerprint?: string;
  },
): Promise<Doc<"incidents"> | null> {
  if (input.sourceIncidentId) {
    const bySource = await ctx.db
      .query("incidents")
      .withIndex("by_source_ref", (q) =>
        q
          .eq("workspaceId", input.workspaceId)
          .eq("source", input.source)
          .eq("sourceRef.sourceIncidentId", input.sourceIncidentId),
      )
      .first();
    if (bySource) return bySource;
  }

  if (input.fingerprint) {
    const rows = await ctx.db
      .query("incidents")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", input.workspaceId))
      .collect();
    const match = rows.find((row) => {
      if (input.service && row.service !== input.service) return false;
      return row.sourceRef?.fingerprint === input.fingerprint;
    });
    if (match) return match;
  }

  return null;
}

export async function createIncidentDoc(
  ctx: DbWriteCtx,
  input: CreateIncidentInput,
): Promise<Doc<"incidents">> {
  if (!input.skipDedup) {
    const existing = await findIncidentByDedupKey(ctx, {
      workspaceId: input.workspaceId,
      source: input.source,
      sourceIncidentId: input.sourceRef?.sourceIncidentId,
      service: input.service,
      fingerprint: input.sourceRef?.fingerprint,
    });
    if (existing) return existing;
  }

  const now = Date.now();
  const startedAt = input.startedAt ?? now;
  const incidentId = await ctx.db.insert("incidents", {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    workstreamId: input.workstreamId,
    title: input.title,
    summary: input.summary,
    status: input.status ?? "open",
    severity: input.severity,
    source: input.source,
    service: input.service,
    environment: input.environment,
    startedAt,
    sourceRef: input.sourceRef,
    linkedWorkstreamIds: input.workstreamId ? [input.workstreamId] : undefined,
    createdAt: now,
    updatedAt: now,
  });

  const doc = (await ctx.db.get(incidentId))!;

  if (!input.skipTimelineEvent) {
    const eventId = await recordIncidentTimelineEvent(ctx, {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      workstreamId: input.workstreamId,
      incidentId,
      title: input.title,
      summary: input.summary,
      source: input.source,
      severity: input.severity,
      status: doc.status,
      service: input.service,
      occurredAt: startedAt,
    });
    await linkIncidentToEventDoc(ctx, incidentId, eventId);
    return (await ctx.db.get(incidentId))!;
  }

  return doc;
}

export async function listIncidentsForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  accessible: AccessibleProjects,
  role: string,
  options?: {
    status?: Doc<"incidents">["status"];
    severity?: Doc<"incidents">["severity"];
    projectId?: Id<"projects">;
    workstreamId?: Id<"workstreams">;
    limit?: number;
  },
): Promise<IncidentRecord[]> {
  const rows = await ctx.db
    .query("incidents")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .order("desc")
    .take(options?.limit ?? 100);

  let filtered = filterIncidentsByAccess(rows, accessible, role);

  if (options?.status) {
    filtered = filtered.filter((i) => i.status === options.status);
  }
  if (options?.severity) {
    filtered = filtered.filter((i) => i.severity === options.severity);
  }
  if (options?.projectId) {
    filtered = filtered.filter((i) => i.projectId === options.projectId);
  }
  if (options?.workstreamId) {
    filtered = filtered.filter(
      (i) =>
        i.workstreamId === options.workstreamId ||
        i.linkedWorkstreamIds?.includes(options.workstreamId!),
    );
  }

  return filtered.map(docToIncident);
}

export async function updateIncidentDoc(
  ctx: DbWriteCtx,
  incidentId: Id<"incidents">,
  patch: Partial<
    Pick<
      Doc<"incidents">,
      | "title"
      | "summary"
      | "severity"
      | "service"
      | "environment"
      | "rootCause"
      | "mitigation"
      | "rollbackSummary"
    >
  >,
): Promise<Doc<"incidents">> {
  await ctx.db.patch(incidentId, { ...patch, updatedAt: Date.now() });
  return (await ctx.db.get(incidentId))!;
}

export async function transitionIncidentStatusDoc(
  ctx: DbWriteCtx,
  incidentId: Id<"incidents">,
  nextStatus: Doc<"incidents">["status"],
  options?: { resolvedAt?: number; skipTimelineEvent?: boolean },
): Promise<Doc<"incidents">> {
  const doc = await ctx.db.get(incidentId);
  if (!doc) throw new Error("Incident not found");

  const patch: Partial<Doc<"incidents">> = {
    status: nextStatus,
    updatedAt: Date.now(),
  };
  if (TERMINAL_STATUSES.has(nextStatus)) {
    patch.resolvedAt = options?.resolvedAt ?? Date.now();
  }

  await ctx.db.patch(incidentId, patch);
  const updated = (await ctx.db.get(incidentId))!;

  if (!options?.skipTimelineEvent) {
    const eventId = await recordIncidentTimelineEvent(ctx, {
      workspaceId: updated.workspaceId,
      projectId: updated.projectId,
      workstreamId: updated.workstreamId,
      incidentId,
      title: `Incident ${nextStatus.replace(/_/g, " ")}: ${updated.title}`,
      summary: updated.summary,
      source: updated.source,
      severity: updated.severity,
      status: nextStatus,
      service: updated.service,
      tags: ["incident", "status_change", nextStatus],
      occurredAt: patch.resolvedAt ?? Date.now(),
    });
    await linkIncidentToEventDoc(ctx, incidentId, eventId);
    return (await ctx.db.get(incidentId))!;
  }

  return updated;
}

export async function linkIncidentToSignalDoc(
  ctx: DbWriteCtx,
  incidentId: Id<"incidents">,
  signalId: Id<"observabilitySignals">,
): Promise<Doc<"incidents">> {
  const doc = await ctx.db.get(incidentId);
  if (!doc) throw new Error("Incident not found");
  const linked = new Set(doc.linkedSignalIds ?? []);
  linked.add(signalId);
  await ctx.db.patch(incidentId, {
    linkedSignalIds: [...linked],
    updatedAt: Date.now(),
  });

  const signal = await ctx.db.get(signalId);
  if (signal && signal.incidentId !== incidentId) {
    await ctx.db.patch(signalId, { incidentId, updatedAt: Date.now() });
  }

  return (await ctx.db.get(incidentId))!;
}

export async function linkIncidentToWorkstreamDoc(
  ctx: DbWriteCtx,
  incidentId: Id<"incidents">,
  workstreamId: Id<"workstreams">,
): Promise<Doc<"incidents">> {
  const doc = await ctx.db.get(incidentId);
  if (!doc) throw new Error("Incident not found");
  const linked = new Set(doc.linkedWorkstreamIds ?? []);
  linked.add(workstreamId);
  await ctx.db.patch(incidentId, {
    workstreamId: doc.workstreamId ?? workstreamId,
    linkedWorkstreamIds: [...linked],
    updatedAt: Date.now(),
  });
  return (await ctx.db.get(incidentId))!;
}

export async function linkIncidentToEventDoc(
  ctx: DbWriteCtx,
  incidentId: Id<"incidents">,
  eventId: Id<"events">,
): Promise<Doc<"incidents">> {
  const doc = await ctx.db.get(incidentId);
  if (!doc) throw new Error("Incident not found");
  const linked = new Set(doc.linkedEventIds ?? []);
  linked.add(eventId);
  await ctx.db.patch(incidentId, {
    linkedEventIds: [...linked],
    updatedAt: Date.now(),
  });
  return (await ctx.db.get(incidentId))!;
}

export async function linkIncidentToDecisionDoc(
  ctx: DbWriteCtx,
  incidentId: Id<"incidents">,
  decisionId: Id<"decisions">,
): Promise<Doc<"incidents">> {
  const doc = await ctx.db.get(incidentId);
  if (!doc) throw new Error("Incident not found");
  const linked = new Set(doc.linkedDecisionIds ?? []);
  linked.add(decisionId);
  await ctx.db.patch(incidentId, {
    linkedDecisionIds: [...linked],
    updatedAt: Date.now(),
  });
  return (await ctx.db.get(incidentId))!;
}

export async function linkIncidentToRollbackDoc(
  ctx: DbWriteCtx,
  incidentId: Id<"incidents">,
  rollbackId: Id<"rollbackEvents">,
): Promise<Doc<"incidents">> {
  const doc = await ctx.db.get(incidentId);
  if (!doc) throw new Error("Incident not found");
  const linked = new Set(doc.linkedRollbackIds ?? []);
  linked.add(rollbackId);
  await ctx.db.patch(incidentId, {
    linkedRollbackIds: [...linked],
    updatedAt: Date.now(),
  });
  return (await ctx.db.get(incidentId))!;
}

export async function updateIncidentStatusDoc(
  ctx: DbWriteCtx,
  incidentId: Id<"incidents">,
  status: Doc<"incidents">["status"],
): Promise<Doc<"incidents">> {
  return transitionIncidentStatusDoc(ctx, incidentId, status);
}

export async function resolveIncidentDoc(
  ctx: DbWriteCtx,
  incidentId: Id<"incidents">,
  patch?: Pick<Doc<"incidents">, "rootCause" | "mitigation" | "rollbackSummary">,
): Promise<Doc<"incidents">> {
  if (patch?.rootCause !== undefined || patch?.mitigation !== undefined || patch?.rollbackSummary !== undefined) {
    await updateIncidentDoc(ctx, incidentId, patch);
  }
  return transitionIncidentStatusDoc(ctx, incidentId, "resolved");
}

export async function markInvestigatingDoc(
  ctx: DbWriteCtx,
  incidentId: Id<"incidents">,
): Promise<Doc<"incidents">> {
  return transitionIncidentStatusDoc(ctx, incidentId, "investigating");
}

export async function markMitigatedDoc(
  ctx: DbWriteCtx,
  incidentId: Id<"incidents">,
): Promise<Doc<"incidents">> {
  return transitionIncidentStatusDoc(ctx, incidentId, "mitigated");
}

export async function markResolvedDoc(
  ctx: DbWriteCtx,
  incidentId: Id<"incidents">,
  patch?: Pick<Doc<"incidents">, "rootCause" | "mitigation">,
): Promise<Doc<"incidents">> {
  if (patch?.rootCause !== undefined || patch?.mitigation !== undefined) {
    await updateIncidentDoc(ctx, incidentId, patch);
  }
  return transitionIncidentStatusDoc(ctx, incidentId, "resolved");
}
