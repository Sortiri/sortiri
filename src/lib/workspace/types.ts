export type Workspace = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceState = {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
};
