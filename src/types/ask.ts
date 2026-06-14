export type AskSessionStatus = "pending" | "completed" | "failed";

export type AskSession = {
  id: string;
  workspaceId: string;
  threadId: string;
  question: string;
  answer?: string;
  status: AskSessionStatus;
  evidenceEventIds?: string[];
  evidenceWorkstreamIds?: string[];
  error?: string;
  createdAt: number;
  updatedAt: number;
};

export type AskEvidenceEvent = {
  id: string;
  title: string;
  workstreamId?: string;
  artifactIds?: string[];
  artifactCount?: number;
  primaryArtifactId?: string;
  primaryArtifactTitle?: string;
};

export type AskEvidenceWorkstream = {
  id: string;
  title: string;
};

export type AskSessionDetail = AskSession & {
  evidence: {
    events: AskEvidenceEvent[];
    workstreams: AskEvidenceWorkstream[];
  };
};

export type AskResult = {
  sessionId: string;
  threadId: string;
  answer: string;
  evidenceEventIds: string[];
  evidenceWorkstreamIds: string[];
};
