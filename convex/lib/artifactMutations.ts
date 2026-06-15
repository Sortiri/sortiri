import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { applyArtifactSafety, recordEvidenceSafetyEvent } from "./sensitiveContent";

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
  sensitivity?: Doc<"artifacts">["sensitivity"];
  redactionStatus?: Doc<"artifacts">["redactionStatus"];
  safeForAudit?: boolean;
  sensitiveFindings?: Doc<"artifacts">["sensitiveFindings"];
};

export async function createArtifact(
  ctx: DbWriteCtx,
  input: CreateArtifactInput,
): Promise<Id<"artifacts">> {
  const now = Date.now();
  const safety = applyArtifactSafety(input.content);

  const artifactId = await ctx.db.insert("artifacts", {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    workstreamId: input.workstreamId,
    type: input.type,
    title: input.title,
    summary: input.summary,
    url: input.url,
    content: safety.content,
    metadata: input.metadata,
    sizeBytes: input.sizeBytes,
    language: input.language,
    filePath: input.filePath,
    truncated: input.truncated,
    sensitivity: input.sensitivity ?? safety.sensitivity,
    redactionStatus: input.redactionStatus ?? safety.redactionStatus,
    safeForAudit: input.safeForAudit ?? safety.safeForAudit,
    sensitiveFindings: input.sensitiveFindings ?? safety.sensitiveFindings,
    createdAt: now,
  });

  if (safety.sensitiveFindings?.length) {
    await recordEvidenceSafetyEvent(ctx, {
      workspaceId: input.workspaceId,
      type: "evidence.sensitive_content_detected",
      title: `Sensitive content detected in artifact: ${input.title}`,
      summary: `${safety.sensitiveFindings.length} finding(s); max severity ${safety.sensitivity}.`,
      importance: safety.sensitivity === "restricted" ? "high" : "normal",
      data: { artifactId, findings: safety.sensitiveFindings },
    });
  }

  return artifactId;
}
