export const WEBHOOK_SECRET_PREFIX = "whsec_sortiri";

export type GithubWebhookSecretStatus = "active" | "revoked";

export type GithubWebhookSecretRecord = {
  id: string;
  workspaceId: string;
  last4: string;
  status: GithubWebhookSecretStatus;
  createdAt: number;
  updatedAt: number;
};

export type CreateGithubWebhookSecretResult = {
  secretId: string;
  rawSecret: string;
  last4: string;
};

export type GithubStatus = {
  connectionStatus: "connected" | "not_connected" | "error" | "revoked";
  maskedSecret?: string;
  secretLast4?: string;
  secretStatus?: "active" | "revoked";
  hasActiveSecret?: boolean;
  eventCount: number;
  lastEventAt?: number;
  legacySecretDetected?: boolean;
  lastError?: string;
  connectionId?: string;
};
