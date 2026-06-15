import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function resolvePostHogProjectId(
  ctx: Pick<QueryCtx, "db">,
  workspaceId: Id<"workspaces">,
  properties: Record<string, unknown>,
): Promise<Id<"projects"> | undefined> {
  const candidate =
    asString(properties.projectId) ??
    asString(properties.project_id) ??
    asString(properties.workspaceId) ??
    asString(properties.workspace_id);

  if (!candidate) return undefined;

  try {
    const byId = await ctx.db.get(candidate as Id<"projects">);
    if (byId && byId.workspaceId === workspaceId) {
      return byId._id;
    }
  } catch {
    // not a valid Convex id
  }

  const projects = await ctx.db
    .query("projects")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  const match = projects.find((project) => project.name === candidate);

  return match?._id;
}
