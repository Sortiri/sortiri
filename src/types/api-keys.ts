export const API_KEY_PREFIX = "sk_sortiri";

export type ApiKeyStatus = "active" | "revoked";

export type ApiKeyRecord = {
  id: string;
  workspaceId: string;
  name: string;
  keyPrefix: string;
  last4: string;
  status: ApiKeyStatus;
  lastUsedAt?: number;
  revokedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type CreateApiKeyResult = {
  apiKeyId: string;
  rawKey: string;
  last4: string;
};

export type VerifyApiKeyResult = {
  valid: boolean;
  revoked?: boolean;
  workspaceExternalId?: string;
  apiKeyId?: string;
};
