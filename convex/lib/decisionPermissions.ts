import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import {
  assertNotAuditorWorkspaceBrowse,
  canWriteWorkspaceData,
  getMembershipAndAccessible,
} from "./authz";
import { canViewProject, type AccessibleProjects } from "./projectAccessLib";
import { getWorkspaceDocByExternalId } from "./workspacesLib";

type DbCtx = Pick<QueryCtx, "db">;

export function canViewDecision(
  decision: Pick<Doc<"decisions">, "projectId">,
  accessible: AccessibleProjects,
  role: string,
): boolean {
  if (role === "auditor") return false;
  if (accessible === "all") return true;
  if (!decision.projectId) return true;
  return accessible.has(decision.projectId);
}

export function filterDecisionsByAccess<T extends Pick<Doc<"decisions">, "projectId">>(
  decisions: T[],
  accessible: AccessibleProjects,
  role: string,
): T[] {
  return decisions.filter((d) => canViewDecision(d, accessible, role));
}

export async function assertDecisionRead(
  ctx: DbCtx,
  _workspaceExternalId: string,
  clerkUserId: string,
  decision: Doc<"decisions">,
) {
  const { membership, accessible } = await getMembershipAndAccessible(
    ctx,
    decision.workspaceId,
    clerkUserId,
  );
  assertNotAuditorWorkspaceBrowse(membership);
  if (!canViewDecision(decision, accessible, membership.role)) {
    throw new Error("Decision not accessible");
  }
  return { membership, accessible };
}

export async function assertDecisionWrite(
  ctx: DbCtx,
  workspaceExternalId: string,
  clerkUserId: string,
  projectId?: Id<"projects">,
) {
  const workspace = await getWorkspaceDocByExternalId(ctx, workspaceExternalId);
  if (!workspace) throw new Error("Workspace not found");
  const { membership, accessible } = await getMembershipAndAccessible(
    ctx,
    workspace._id,
    clerkUserId,
  );
  assertNotAuditorWorkspaceBrowse(membership);
  if (!canWriteWorkspaceData(membership.role)) {
    throw new Error("Insufficient permissions to modify decisions");
  }
  if (projectId && accessible !== "all" && !canViewProject(membership.role, null)) {
    if (!accessible.has(projectId)) {
      throw new Error("Project not accessible");
    }
  }
  return { membership, accessible };
}
