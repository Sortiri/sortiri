import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { assertLessonCopy } from "./lessonCopy";
import type { LessonRecord } from "./lessonsLib";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type PlaybookStep = {
  title: string;
  description?: string;
  required?: boolean;
  order?: number;
};

export type PlaybookValidationRequirement = {
  title: string;
  command?: string;
  reason?: string;
  required?: boolean;
};

export type PlaybookInput = {
  workspaceId: Id<"workspaces">;
  projectId?: Id<"projects">;
  viewId?: Id<"savedViews">;
  title: string;
  summary: string;
  type: Doc<"playbooks">["type"];
  status: Doc<"playbooks">["status"];
  trigger?: string;
  steps: PlaybookStep[];
  validationRequirements?: PlaybookValidationRequirement[];
  lessonIds?: Id<"lessons">[];
  evidenceEventIds?: Id<"events">[];
  evidenceWorkstreamIds?: Id<"workstreams">[];
  evidenceImpactAnalysisIds?: Id<"impactAnalyses">[];
  evidenceDecisionIds?: Id<"decisions">[];
  evidenceIncidentIds?: Id<"incidents">[];
  tags?: string[];
  createdBy?: Doc<"playbooks">["createdBy"];
};

export type PlaybookRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  viewId?: string;
  title: string;
  summary: string;
  type: Doc<"playbooks">["type"];
  status: PlaybookStatus;
  trigger?: string;
  steps: PlaybookStep[];
  validationRequirements?: PlaybookValidationRequirement[];
  lessonIds?: string[];
  evidenceEventIds?: string[];
  evidenceWorkstreamIds?: string[];
  evidenceImpactAnalysisIds?: string[];
  tags?: string[];
  createdBy?: Doc<"playbooks">["createdBy"];
  createdAt: number;
  updatedAt: number;
};

type PlaybookStatus = Doc<"playbooks">["status"];

function validatePlaybookCopy(input: { title: string; summary: string }): void {
  if (!assertLessonCopy(input.title) || !assertLessonCopy(input.summary)) {
    throw new Error("Playbook copy must use cautious language");
  }
}

export function docToPlaybook(doc: Doc<"playbooks">): PlaybookRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    viewId: doc.viewId,
    title: doc.title,
    summary: doc.summary,
    type: doc.type,
    status: doc.status,
    trigger: doc.trigger,
    steps: doc.steps,
    validationRequirements: doc.validationRequirements,
    lessonIds: doc.lessonIds,
    evidenceEventIds: doc.evidenceEventIds,
    evidenceWorkstreamIds: doc.evidenceWorkstreamIds,
    evidenceImpactAnalysisIds: doc.evidenceImpactAnalysisIds,
    tags: doc.tags,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function createPlaybookDoc(
  ctx: DbWriteCtx,
  input: PlaybookInput,
): Promise<Id<"playbooks">> {
  validatePlaybookCopy(input);
  const now = Date.now();
  return ctx.db.insert("playbooks", {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    viewId: input.viewId,
    title: input.title,
    summary: input.summary,
    type: input.type,
    status: input.status,
    trigger: input.trigger,
    steps: input.steps,
    validationRequirements: input.validationRequirements,
    lessonIds: input.lessonIds,
    evidenceEventIds: input.evidenceEventIds,
    evidenceWorkstreamIds: input.evidenceWorkstreamIds,
    evidenceImpactAnalysisIds: input.evidenceImpactAnalysisIds,
    evidenceDecisionIds: input.evidenceDecisionIds,
    evidenceIncidentIds: input.evidenceIncidentIds,
    tags: input.tags,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
}

export async function patchPlaybookDoc(
  ctx: DbWriteCtx,
  playbookId: Id<"playbooks">,
  patch: Partial<
    Pick<
      Doc<"playbooks">,
      | "status"
      | "title"
      | "summary"
      | "trigger"
      | "steps"
      | "validationRequirements"
      | "lessonIds"
      | "tags"
    >
  >,
): Promise<void> {
  if (patch.title || patch.summary) {
    validatePlaybookCopy({
      title: patch.title ?? "",
      summary: patch.summary ?? "",
    });
  }
  await ctx.db.patch(playbookId, { ...patch, updatedAt: Date.now() });
}

export async function listPlaybooksForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  options: {
    limit?: number;
    type?: Doc<"playbooks">["type"];
    status?: Doc<"playbooks">["status"];
  } = {},
): Promise<PlaybookRecord[]> {
  const limit = options.limit ?? 50;
  let docs;
  if (options.type) {
    docs = await ctx.db
      .query("playbooks")
      .withIndex("by_workspace_type", (q) =>
        q.eq("workspaceId", workspaceId).eq("type", options.type!),
      )
      .order("desc")
      .take(limit);
  } else if (options.status) {
    docs = await ctx.db
      .query("playbooks")
      .withIndex("by_workspace_status", (q) =>
        q.eq("workspaceId", workspaceId).eq("status", options.status!),
      )
      .order("desc")
      .take(limit);
  } else {
    docs = await ctx.db
      .query("playbooks")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .order("desc")
      .take(limit);
  }
  return docs.map(docToPlaybook);
}

export async function listPlaybooksByProject(
  ctx: DbReadCtx,
  projectId: Id<"projects">,
): Promise<PlaybookRecord[]> {
  const docs = await ctx.db
    .query("playbooks")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  return docs.map(docToPlaybook);
}

export async function findPlaybookByTitle(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  title: string,
): Promise<PlaybookRecord | null> {
  const docs = await ctx.db
    .query("playbooks")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  const match = docs.find((d) => d.title === title);
  return match ? docToPlaybook(match) : null;
}

export function suggestPlaybooksForGoal(
  playbooks: PlaybookRecord[],
  goal: string,
): PlaybookRecord[] {
  const normalized = goal.toLowerCase();
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return playbooks
    .filter((pb) => {
      const haystack = `${pb.title} ${pb.trigger ?? ""} ${(pb.tags ?? []).join(" ")}`.toLowerCase();
      return tokens.some((token) => haystack.includes(token));
    })
    .slice(0, 5);
}

export function unionLessonEvidence(lessons: LessonRecord[]): {
  eventIds: Id<"events">[];
  workstreamIds: Id<"workstreams">[];
  impactAnalysisIds: Id<"impactAnalyses">[];
} {
  const eventSet = new Set<string>();
  const workstreamSet = new Set<string>();
  const impactSet = new Set<string>();
  for (const lesson of lessons) {
    for (const id of lesson.evidenceEventIds ?? []) eventSet.add(id);
    for (const id of lesson.evidenceWorkstreamIds ?? []) workstreamSet.add(id);
    for (const id of lesson.evidenceImpactAnalysisIds ?? []) impactSet.add(id);
    if (lesson.impactAnalysisId) impactSet.add(lesson.impactAnalysisId);
  }
  return {
    eventIds: [...eventSet] as Id<"events">[],
    workstreamIds: [...workstreamSet] as Id<"workstreams">[],
    impactAnalysisIds: [...impactSet] as Id<"impactAnalyses">[],
  };
}
