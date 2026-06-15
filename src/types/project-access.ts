export type ProjectAccessLevel = "owner" | "manager" | "editor" | "viewer";

export type ProjectAccessStatus = "active" | "revoked";

export type ProjectAccessRecord = {
  id: string;
  workspaceId: string;
  projectId: string;
  memberId: string;
  accessLevel: ProjectAccessLevel;
  grantedBy?: {
    clerkUserId?: string;
    email?: string;
    name?: string;
  };
  status: ProjectAccessStatus;
  createdAt: number;
  updatedAt: number;
  revokedAt?: number;
};

export type ProjectAccessWithMember = ProjectAccessRecord & {
  memberName?: string;
  memberEmail?: string;
  memberRole?: string;
};

export type ProjectAccessWithProject = ProjectAccessRecord & {
  projectName: string;
};

export type ProjectAccessCheck = {
  canAccess: boolean;
  accessLevel?: ProjectAccessLevel;
  reason: string;
};

const WRITE_LEVELS: ProjectAccessLevel[] = ["owner", "manager", "editor"];
const MANAGE_LEVELS: ProjectAccessLevel[] = ["owner"];

export function canWriteProjectData(level: ProjectAccessLevel): boolean {
  return WRITE_LEVELS.includes(level);
}

export function canManageProjectAccess(level: ProjectAccessLevel): boolean {
  return MANAGE_LEVELS.includes(level);
}

export function canManageProjectWorkstreams(level: ProjectAccessLevel): boolean {
  return level === "owner" || level === "manager" || level === "editor";
}

export function canGenerateProjectInsights(level: ProjectAccessLevel): boolean {
  return level === "owner" || level === "manager";
}
