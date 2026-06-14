import type { WorkspaceRole } from "@/types/workspace-members";

export type Workspace = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  role?: WorkspaceRole;
};

export type WorkspaceState = {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
};
