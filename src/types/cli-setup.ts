export const SETUP_TOKEN_PREFIX = "stup_sortiri";

export type CliSetupTokenStatus = "active" | "used" | "expired" | "revoked";

export type CliSetupTokenRecord = {
  id: string;
  workspaceId: string;
  tokenPrefix: string;
  last4: string;
  status: CliSetupTokenStatus;
  expiresAt: number;
  usedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type CreateSetupTokenResult = {
  tokenId: string;
  rawToken: string;
  expiresAt: number;
};

export type ConsumeSetupTokenResult =
  | { ok: true; workspaceId: string }
  | { ok: false; error: "invalid" | "expired" | "used" | "revoked" };
