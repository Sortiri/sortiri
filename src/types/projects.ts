export type ProjectStatus = "active" | "archived";

export type ProjectRecord = {
  id: string;
  workspaceId: string;
  name: string;
  slug?: string;
  description?: string;
  repositoryUrl?: string;
  localPath?: string;
  status: ProjectStatus;
  lastEventAt?: number;
  eventCount?: number;
  createdAt: number;
  updatedAt: number;
};

export type ProjectPulseCounts = {
  totalEvents: number;
  agentActions: number;
  codeChanges: number;
  productEvents: number;
  decisions: number;
  revenueEvents: number;
  systemEvents: number;
  activeWorkstreams: number;
};

export type ActiveProjectSummary = {
  projectId: string;
  name: string;
  eventsToday: number;
  activeWorkstreams: number;
  lastEventAt?: number;
};
