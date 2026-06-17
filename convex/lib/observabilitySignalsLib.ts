import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { filterObservabilitySignalsByAccess } from "./incidentPermissions";
import type { AccessibleProjects } from "./projectAccessLib";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type ObservabilitySignalRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  workstreamId?: string;
  incidentId?: string;
  source: Doc<"observabilitySignals">["source"];
  signalType: Doc<"observabilitySignals">["signalType"];
  severity: Doc<"observabilitySignals">["severity"];
  title: string;
  summary?: string;
  service?: string;
  environment?: string;
  region?: string;
  fingerprint?: string;
  sourceSignalId?: string;
  sourceUrl?: string;
  occurredAt: number;
  metadata?: unknown;
  linkedEventIds?: string[];
  linkedWorkstreamIds?: string[];
  linkedDecisionIds?: string[];
  linkedRollbackIds?: string[];
  linkedArtifactIds?: string[];
  createdAt: number;
  updatedAt: number;
};

export function docToObservabilitySignal(
  doc: Doc<"observabilitySignals">,
): ObservabilitySignalRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    workstreamId: doc.workstreamId,
    incidentId: doc.incidentId,
    source: doc.source,
    signalType: doc.signalType,
    severity: doc.severity,
    title: doc.title,
    summary: doc.summary,
    service: doc.service,
    environment: doc.environment,
    region: doc.region,
    fingerprint: doc.fingerprint,
    sourceSignalId: doc.sourceSignalId,
    sourceUrl: doc.sourceUrl,
    occurredAt: doc.occurredAt,
    metadata: doc.metadata,
    linkedEventIds: doc.linkedEventIds,
    linkedWorkstreamIds: doc.linkedWorkstreamIds,
    linkedDecisionIds: doc.linkedDecisionIds,
    linkedRollbackIds: doc.linkedRollbackIds,
    linkedArtifactIds: doc.linkedArtifactIds,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type CreateObservabilitySignalInput = {
  workspaceId: Id<"workspaces">;
  projectId?: Id<"projects">;
  workstreamId?: Id<"workstreams">;
  incidentId?: Id<"incidents">;
  source: Doc<"observabilitySignals">["source"];
  signalType: Doc<"observabilitySignals">["signalType"];
  severity: Doc<"observabilitySignals">["severity"];
  title: string;
  summary?: string;
  service?: string;
  environment?: string;
  region?: string;
  fingerprint?: string;
  sourceSignalId?: string;
  sourceUrl?: string;
  occurredAt?: number;
  metadata?: unknown;
  skipDedup?: boolean;
};

export async function findObservabilitySignalByDedupKey(
  ctx: DbReadCtx,
  input: {
    workspaceId: Id<"workspaces">;
    source: Doc<"observabilitySignals">["source"];
    sourceSignalId?: string;
    signalType?: Doc<"observabilitySignals">["signalType"];
    service?: string;
    fingerprint?: string;
  },
): Promise<Doc<"observabilitySignals"> | null> {
  if (input.sourceSignalId) {
    const bySource = await ctx.db
      .query("observabilitySignals")
      .withIndex("by_source_signal", (q) =>
        q
          .eq("workspaceId", input.workspaceId)
          .eq("source", input.source)
          .eq("sourceSignalId", input.sourceSignalId),
      )
      .first();
    if (bySource) return bySource;
  }

  if (input.fingerprint) {
    const candidates = await ctx.db
      .query("observabilitySignals")
      .withIndex("by_fingerprint", (q) =>
        q.eq("workspaceId", input.workspaceId).eq("fingerprint", input.fingerprint),
      )
      .collect();
    const match = candidates.find((row) => {
      if (input.service && row.service !== input.service) return false;
      if (input.signalType && row.signalType !== input.signalType) return false;
      return true;
    });
    if (match) return match;
  }

  return null;
}

export async function createObservabilitySignalDoc(
  ctx: DbWriteCtx,
  input: CreateObservabilitySignalInput,
): Promise<Doc<"observabilitySignals">> {
  if (!input.skipDedup) {
    const existing = await findObservabilitySignalByDedupKey(ctx, {
      workspaceId: input.workspaceId,
      source: input.source,
      sourceSignalId: input.sourceSignalId,
      signalType: input.signalType,
      service: input.service,
      fingerprint: input.fingerprint,
    });
    if (existing) return existing;
  }

  const now = Date.now();
  const occurredAt = input.occurredAt ?? now;
  const signalId = await ctx.db.insert("observabilitySignals", {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    workstreamId: input.workstreamId,
    incidentId: input.incidentId,
    source: input.source,
    signalType: input.signalType,
    severity: input.severity,
    title: input.title,
    summary: input.summary,
    service: input.service,
    environment: input.environment,
    region: input.region,
    fingerprint: input.fingerprint,
    sourceSignalId: input.sourceSignalId,
    sourceUrl: input.sourceUrl,
    occurredAt,
    metadata: input.metadata,
    linkedWorkstreamIds: input.workstreamId ? [input.workstreamId] : undefined,
    createdAt: now,
    updatedAt: now,
  });
  return (await ctx.db.get(signalId))!;
}

export async function listObservabilitySignalsForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  accessible: AccessibleProjects,
  role: string,
  options?: {
    signalType?: Doc<"observabilitySignals">["signalType"];
    severity?: Doc<"observabilitySignals">["severity"];
    projectId?: Id<"projects">;
    workstreamId?: Id<"workstreams">;
    incidentId?: Id<"incidents">;
    limit?: number;
  },
): Promise<ObservabilitySignalRecord[]> {
  const rows = await ctx.db
    .query("observabilitySignals")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .order("desc")
    .take(options?.limit ?? 100);

  let filtered = filterObservabilitySignalsByAccess(rows, accessible, role);

  if (options?.signalType) {
    filtered = filtered.filter((s) => s.signalType === options.signalType);
  }
  if (options?.severity) {
    filtered = filtered.filter((s) => s.severity === options.severity);
  }
  if (options?.projectId) {
    filtered = filtered.filter((s) => s.projectId === options.projectId);
  }
  if (options?.workstreamId) {
    filtered = filtered.filter(
      (s) =>
        s.workstreamId === options.workstreamId ||
        s.linkedWorkstreamIds?.includes(options.workstreamId!),
    );
  }
  if (options?.incidentId) {
    filtered = filtered.filter((s) => s.incidentId === options.incidentId);
  }

  return filtered.map(docToObservabilitySignal);
}

export async function updateObservabilitySignalDoc(
  ctx: DbWriteCtx,
  signalId: Id<"observabilitySignals">,
  patch: Partial<
    Pick<
      Doc<"observabilitySignals">,
      | "title"
      | "summary"
      | "severity"
      | "signalType"
      | "incidentId"
      | "service"
      | "environment"
      | "region"
      | "metadata"
    >
  >,
): Promise<Doc<"observabilitySignals">> {
  await ctx.db.patch(signalId, { ...patch, updatedAt: Date.now() });
  return (await ctx.db.get(signalId))!;
}

export async function linkObservabilitySignalToIncidentDoc(
  ctx: DbWriteCtx,
  signalId: Id<"observabilitySignals">,
  incidentId: Id<"incidents">,
): Promise<Doc<"observabilitySignals">> {
  const doc = await ctx.db.get(signalId);
  if (!doc) throw new Error("Observability signal not found");
  await ctx.db.patch(signalId, { incidentId, updatedAt: Date.now() });

  const incident = await ctx.db.get(incidentId);
  if (incident) {
    const linked = new Set(incident.linkedSignalIds ?? []);
    linked.add(signalId);
    await ctx.db.patch(incidentId, {
      linkedSignalIds: [...linked],
      updatedAt: Date.now(),
    });
  }

  return (await ctx.db.get(signalId))!;
}

export async function linkObservabilitySignalToWorkstreamDoc(
  ctx: DbWriteCtx,
  signalId: Id<"observabilitySignals">,
  workstreamId: Id<"workstreams">,
): Promise<Doc<"observabilitySignals">> {
  const doc = await ctx.db.get(signalId);
  if (!doc) throw new Error("Observability signal not found");
  const linked = new Set(doc.linkedWorkstreamIds ?? []);
  linked.add(workstreamId);
  await ctx.db.patch(signalId, {
    workstreamId: doc.workstreamId ?? workstreamId,
    linkedWorkstreamIds: [...linked],
    updatedAt: Date.now(),
  });
  return (await ctx.db.get(signalId))!;
}

export async function linkObservabilitySignalToEventDoc(
  ctx: DbWriteCtx,
  signalId: Id<"observabilitySignals">,
  eventId: Id<"events">,
): Promise<Doc<"observabilitySignals">> {
  const doc = await ctx.db.get(signalId);
  if (!doc) throw new Error("Observability signal not found");
  const linked = new Set(doc.linkedEventIds ?? []);
  linked.add(eventId);
  await ctx.db.patch(signalId, {
    linkedEventIds: [...linked],
    updatedAt: Date.now(),
  });
  return (await ctx.db.get(signalId))!;
}

export async function linkObservabilitySignalToDecisionDoc(
  ctx: DbWriteCtx,
  signalId: Id<"observabilitySignals">,
  decisionId: Id<"decisions">,
): Promise<Doc<"observabilitySignals">> {
  const doc = await ctx.db.get(signalId);
  if (!doc) throw new Error("Observability signal not found");
  const linked = new Set(doc.linkedDecisionIds ?? []);
  linked.add(decisionId);
  await ctx.db.patch(signalId, {
    linkedDecisionIds: [...linked],
    updatedAt: Date.now(),
  });
  return (await ctx.db.get(signalId))!;
}

export async function linkObservabilitySignalToRollbackDoc(
  ctx: DbWriteCtx,
  signalId: Id<"observabilitySignals">,
  rollbackId: Id<"rollbackEvents">,
): Promise<Doc<"observabilitySignals">> {
  const doc = await ctx.db.get(signalId);
  if (!doc) throw new Error("Observability signal not found");
  const linked = new Set(doc.linkedRollbackIds ?? []);
  linked.add(rollbackId);
  await ctx.db.patch(signalId, {
    linkedRollbackIds: [...linked],
    updatedAt: Date.now(),
  });
  return (await ctx.db.get(signalId))!;
}
