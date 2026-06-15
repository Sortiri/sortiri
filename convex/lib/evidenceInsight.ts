import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { InsightFindingInput } from "./insightRunsLib";

type DbReadCtx = Pick<QueryCtx, "db">;

export async function countSensitiveEvidenceNeedingReview(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
): Promise<number> {
  const artifacts = await ctx.db
    .query("artifacts")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  return artifacts.filter(
    (artifact) =>
      artifact.safeForAudit === false ||
      artifact.redactionStatus === "needs_review" ||
      artifact.redactionStatus === "redacted",
  ).length;
}

export function buildSensitiveEvidenceFinding(count: number): InsightFindingInput | null {
  if (count <= 0) return null;
  return {
    type: "sensitive_evidence",
    severity: count > 3 ? "critical" : "warning",
    title: "Sensitive evidence needs review",
    summary: `${count} artifact${count === 1 ? "" : "s"} contain redacted or restricted content that must be reviewed before audit export.`,
    recommendation: "Open Evidence Review to approve or block items before generating audit reports.",
    data: { reviewPath: "/security/evidence", count },
  };
}
