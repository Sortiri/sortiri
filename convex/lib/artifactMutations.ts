import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

type DbWriteCtx = Pick<MutationCtx, "db">;

export type CreateArtifactInput = {
  workspaceId: Id<"workspaces">;
  projectId?: Id<"projects">;
  workstreamId?: Id<"workstreams">;
  type: Doc<"artifacts">["type"];
  title: string;
  summary?: string;
  url?: string;
  content?: string;
  metadata?: unknown;
  sizeBytes?: number;
  language?: string;
  filePath?: string;
  truncated?: boolean;
};

export async function createArtifact(
  ctx: DbWriteCtx,
  input: CreateArtifactInput,
): Promise<Id<"artifacts">> {
  const now = Date.now();
  return ctx.db.insert("artifacts", {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    workstreamId: input.workstreamId,
    type: input.type,
    title: input.title,
    summary: input.summary,
    url: input.url,
    content: input.content,
    metadata: input.metadata,
    sizeBytes: input.sizeBytes,
    language: input.language,
    filePath: input.filePath,
    truncated: input.truncated,
    createdAt: now,
  });
}
