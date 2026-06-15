export type WorkspaceRole = "owner" | "admin" | "member" | "viewer" | "auditor";

export type MemberStatus = "active" | "removed";

export type WorkspaceMemberRecord = {
  id: string;
  workspaceId: string;
  clerkUserId: string;
  email?: string;
  name?: string;
  imageUrl?: string;
  role: WorkspaceRole;
  status: MemberStatus;
  joinedAt?: number;
  invitedBy?: {
    clerkUserId?: string;
    email?: string;
    name?: string;
  };
  createdAt: number;
  updatedAt: number;
};

export type WorkspaceMembershipCapabilities = {
  role: WorkspaceRole;
  status: MemberStatus;
  canManageMembers: boolean;
  canManageSources: boolean;
  canCreateApiKeys: boolean;
  canManageWorkspace: boolean;
  canWriteWorkspaceData: boolean;
  canManageViews: boolean;
  canCreatePrivateViews: boolean;
  canManageProjectAssignments: boolean;
  canAccessWorkspaceNav: boolean;
  canManageAuditReports: boolean;
};

export function buildMembershipCapabilities(
  role: WorkspaceRole,
  status: MemberStatus,
): WorkspaceMembershipCapabilities {
  const active = status === "active";
  return {
    role,
    status,
    canManageMembers: active && (role === "owner" || role === "admin"),
    canManageSources: active && (role === "owner" || role === "admin"),
    canCreateApiKeys: active && (role === "owner" || role === "admin"),
    canManageWorkspace: active && role === "owner",
    canWriteWorkspaceData:
      active && (role === "owner" || role === "admin" || role === "member"),
    canManageViews: active && (role === "owner" || role === "admin"),
    canCreatePrivateViews:
      active && (role === "owner" || role === "admin" || role === "member"),
    canManageProjectAssignments: active && (role === "owner" || role === "admin"),
    canAccessWorkspaceNav: active && role !== "auditor",
    canManageAuditReports: active && (role === "owner" || role === "admin"),
  };
}

export function canCreateWorkspaceView(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

export function canCreatePrivateView(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin" || role === "member";
}
