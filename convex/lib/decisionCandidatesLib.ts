import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { createDecisionDoc } from "./decisionsLib";
import { redactSlackPreview } from "./decisionExtraction";
import type { AccessibleProjects } from "./projectAccessLib";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type DecisionCandidateRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  workstreamId?: string;
  source: Doc<"decisionCandidates">["source"];
  status: Doc<"decisionCandidates">["status"];
  confidence: Doc<"decisionCandidates">["confidence"];
  title: string;
  summary?: string;
  rawTextPreview?: string;
  sourceRef: Doc<"decisionCandidates">["sourceRef"];
  extractedSignals?: string[];
  suggestedDecisionType?: string;
  suggestedEntities?: string[];
  suggestedTags?: string[];
  confirmedDecisionId?: string;
  createdAt: number;
  updatedAt: number;
};

export function docToDecisionCandidate(doc: Doc<"decisionCandidates">): DecisionCandidateRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    workstreamId: doc.workstreamId,
    source: doc.source,
    status: doc.status,
    confidence: doc.confidence,
    title: doc.title,
    summary: doc.summary,
    rawTextPreview: doc.rawTextPreview,
    sourceRef: doc.sourceRef,
    extractedSignals: doc.extractedSignals,
    suggestedDecisionType: doc.suggestedDecisionType,
    suggestedEntities: doc.suggestedEntities,
    suggestedTags: doc.suggestedTags,
    confirmedDecisionId: doc.confirmedDecisionId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type CreateCandidateInput = {
  workspaceId: Id<"workspaces">;
  projectId?: Id<"projects">;
  workstreamId?: Id<"workstreams">;
  source: Doc<"decisionCandidates">["source"];
  confidence: Doc<"decisionCandidates">["confidence"];
  title: string;
  summary?: string;
  rawText?: string;
  sourceRef: Doc<"decisionCandidates">["sourceRef"];
  extractedSignals?: string[];
  suggestedDecisionType?: string;
  suggestedEntities?: string[];
  suggestedTags?: string[];
};

export async function createDecisionCandidateDoc(
  ctx: DbWriteCtx,
  input: CreateCandidateInput,
): Promise<Doc<"decisionCandidates">> {
  const now = Date.now();
  const id = await ctx.db.insert("decisionCandidates", {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    workstreamId: input.workstreamId,
    source: input.source,
    status: "pending",
    confidence: input.confidence,
    title: input.title,
    summary: input.summary,
    rawTextPreview: input.rawText ? redactSlackPreview(input.rawText) : undefined,
    sourceRef: input.sourceRef,
    extractedSignals: input.extractedSignals,
    suggestedDecisionType: input.suggestedDecisionType,
    suggestedEntities: input.suggestedEntities,
    suggestedTags: input.suggestedTags,
    createdAt: now,
    updatedAt: now,
  });
  return (await ctx.db.get(id))!;
}

export async function listDecisionCandidatesForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  options?: {
    status?: Doc<"decisionCandidates">["status"];
    limit?: number;
  },
): Promise<DecisionCandidateRecord[]> {
  const status = options?.status ?? "pending";
  const rows = await ctx.db
    .query("decisionCandidates")
    .withIndex("by_workspace_status", (q) =>
      q.eq("workspaceId", workspaceId).eq("status", status),
    )
    .order("desc")
    .take(options?.limit ?? 50);
  return rows.map(docToDecisionCandidate);
}

export async function confirmDecisionCandidateDoc(
  ctx: DbWriteCtx,
  candidateId: Id<"decisionCandidates">,
  decidedBy?: Doc<"decisions">["decidedBy"],
): Promise<{ candidate: Doc<"decisionCandidates">; decision: Doc<"decisions"> }> {
  const candidate = await ctx.db.get(candidateId);
  if (!candidate) throw new Error("Candidate not found");
  if (candidate.status !== "pending") throw new Error("Candidate is not pending");

  const decisionType =
    (candidate.suggestedDecisionType as Doc<"decisions">["decisionType"]) ?? "other";

  const decision = await createDecisionDoc(ctx, {
    workspaceId: candidate.workspaceId,
    projectId: candidate.projectId,
    workstreamId: candidate.workstreamId,
    title: candidate.title,
    summary: candidate.summary,
    decisionType,
    source: candidate.source === "slack" ? "slack" : "system",
    sourceRef: candidate.sourceRef,
    decidedBy,
    entities: candidate.suggestedEntities,
    tags: candidate.suggestedTags ?? ["decision"],
  });

  await ctx.db.patch(candidateId, {
    status: "confirmed",
    confirmedDecisionId: decision._id,
    updatedAt: Date.now(),
  });

  return {
    candidate: (await ctx.db.get(candidateId))!,
    decision,
  };
}

export async function dismissDecisionCandidateDoc(
  ctx: DbWriteCtx,
  candidateId: Id<"decisionCandidates">,
): Promise<Doc<"decisionCandidates">> {
  const candidate = await ctx.db.get(candidateId);
  if (!candidate) throw new Error("Candidate not found");
  await ctx.db.patch(candidateId, { status: "dismissed", updatedAt: Date.now() });
  return (await ctx.db.get(candidateId))!;
}

export function filterCandidatesByAccess<T extends Pick<Doc<"decisionCandidates">, "projectId">>(
  candidates: T[],
  accessible: AccessibleProjects,
  role: string,
): T[] {
  if (role === "auditor") return [];
  if (accessible === "all") return candidates;
  return candidates.filter((c) => !c.projectId || accessible.has(c.projectId));
}
