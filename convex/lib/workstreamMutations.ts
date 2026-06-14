import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { buildWorkstreamSearchText } from "./search";

type DbWriteCtx = Pick<MutationCtx, "db">;

export type CreateWorkstreamInput = {
  workspaceId: Id<"workspaces">;
  projectId?: Id<"projects">;
  title: string;
  summary?: string;
  createdBy?: Doc<"workstreams">["createdBy"];
};

export async function createWorkstream(
  ctx: DbWriteCtx,
  input: CreateWorkstreamInput,
): Promise<Id<"workstreams">> {
  const now = Date.now();
  const searchText = buildWorkstreamSearchText({
    title: input.title,
    summary: input.summary,
    status: "active",
    createdBy: input.createdBy,
  });

  return ctx.db.insert("workstreams", {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    title: input.title,
    summary: input.summary,
    status: "active",
    createdBy: input.createdBy,
    searchText,
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

export type FinishWorkstreamInput = {
  workstreamId: Id<"workstreams">;
  workspaceId: Id<"workspaces">;
  summary?: string;
  outcome?: string;
};

export async function finishWorkstream(
  ctx: DbWriteCtx,
  input: FinishWorkstreamInput,
): Promise<Id<"workstreams">> {
  const workstream = await ctx.db.get(input.workstreamId);
  if (!workstream || workstream.workspaceId !== input.workspaceId) {
    throw new Error("Workstream not found");
  }

  const now = Date.now();
  let summary = input.summary ?? workstream.summary;
  if (input.outcome) {
    summary = summary ? `${summary}\n\n${input.outcome}` : input.outcome;
  }

  const nextSummary = summary !== undefined ? summary : workstream.summary;
  const searchText = buildWorkstreamSearchText({
    title: workstream.title,
    summary: nextSummary,
    status: "completed",
    createdBy: workstream.createdBy,
  });

  await ctx.db.patch(input.workstreamId, {
    status: "completed",
    endedAt: now,
    updatedAt: now,
    searchText,
    summary: nextSummary,
  });

  return input.workstreamId;
}
