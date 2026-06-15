export const POSTHOG_WEBHOOK_SECRET_PREFIX = "phsec_sortiri";

export const POSTHOG_RECOMMENDED_EVENTS = [
  "user signed up",
  "trial started",
  "onboarding completed",
  "feature used",
  "project created",
  "invite sent",
  "subscription viewed",
  "checkout clicked",
  "activation milestone",
] as const;

export type PostHogConnectionStatus =
  | "connected"
  | "not_connected"
  | "error"
  | "revoked";

export type PostHogStatus = {
  connectionStatus: PostHogConnectionStatus;
  maskedSecret?: string;
  secretLast4?: string;
  secretStatus?: "active" | "revoked";
  eventCount: number;
  lastEventAt?: number;
  lastError?: string;
};

export type CreatePostHogWebhookSecretResult = {
  rawSecret: string;
  last4: string;
};

export type SavePostHogWebhookSecretResult = {
  ok: true;
  last4: string;
};

export const MIN_POSTHOG_SECRET_LENGTH = 24;
