export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

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
  };
}
