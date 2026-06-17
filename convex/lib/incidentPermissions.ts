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

export function canViewIncident(
  incident: Pick<Doc<"incidents">, "projectId">,
  accessible: AccessibleProjects,
  role: string,
): boolean {
  if (role === "auditor") return false;
  if (accessible === "all") return true;
  if (!incident.projectId) return true;
  return accessible.has(incident.projectId);
}

export function canViewObservabilitySignal(
  signal: Pick<Doc<"observabilitySignals">, "projectId">,
  accessible: AccessibleProjects,
  role: string,
): boolean {
  if (role === "auditor") return false;
  if (accessible === "all") return true;
  if (!signal.projectId) return true;
  return accessible.has(signal.projectId);
}

export function filterIncidentsByAccess<T extends Pick<Doc<"incidents">, "projectId">>(
  incidents: T[],
  accessible: AccessibleProjects,
  role: string,
): T[] {
  return incidents.filter((i) => canViewIncident(i, accessible, role));
}

export function filterObservabilitySignalsByAccess<
  T extends Pick<Doc<"observabilitySignals">, "projectId">,
>(signals: T[], accessible: AccessibleProjects, role: string): T[] {
  return signals.filter((s) => canViewObservabilitySignal(s, accessible, role));
}

export async function assertIncidentRead(
  ctx: DbCtx,
  _workspaceExternalId: string,
  clerkUserId: string,
  incident: Doc<"incidents">,
) {
  const { membership, accessible } = await getMembershipAndAccessible(
    ctx,
    incident.workspaceId,
    clerkUserId,
  );
  assertNotAuditorWorkspaceBrowse(membership);
  if (!canViewIncident(incident, accessible, membership.role)) {
    throw new Error("Incident not accessible");
  }
  return { membership, accessible };
}

export async function assertIncidentWrite(
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
    throw new Error("Insufficient permissions to modify incidents");
  }
  if (projectId && accessible !== "all" && !canViewProject(membership.role, null)) {
    if (!accessible.has(projectId)) {
      throw new Error("Project not accessible");
    }
  }
  return { membership, accessible };
}

export async function assertObservabilitySignalRead(
  ctx: DbCtx,
  _workspaceExternalId: string,
  clerkUserId: string,
  signal: Doc<"observabilitySignals">,
) {
  const { membership, accessible } = await getMembershipAndAccessible(
    ctx,
    signal.workspaceId,
    clerkUserId,
  );
  assertNotAuditorWorkspaceBrowse(membership);
  if (!canViewObservabilitySignal(signal, accessible, membership.role)) {
    throw new Error("Observability signal not accessible");
  }
  return { membership, accessible };
}

export async function assertObservabilitySignalWrite(
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
    throw new Error("Insufficient permissions to modify observability signals");
  }
  if (projectId && accessible !== "all" && !canViewProject(membership.role, null)) {
    if (!accessible.has(projectId)) {
      throw new Error("Project not accessible");
    }
  }
  return { membership, accessible };
}
