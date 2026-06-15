export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

export type InviteRole = "admin" | "member" | "viewer" | "auditor";

export const INVITE_TOKEN_PREFIX = "invite_sortiri_";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type WorkspaceInviteRecord = {
  id: string;
  workspaceId: string;
  email: string;
  role: InviteRole;
  tokenPrefix: string;
  last4: string;
  status: InviteStatus;
  expiresAt: number;
  invitedBy?: {
    clerkUserId?: string;
    email?: string;
    name?: string;
  };
  acceptedByUserId?: string;
  acceptedAt?: number;
  createdAt: number;
  updatedAt: number;
};
