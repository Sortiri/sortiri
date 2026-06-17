export const SLACK_SIGNING_SECRET_PREFIX = "slack_sign_";

export type SlackStatus = {
  connected: boolean;
  maskedSecret?: string;
  captureMode: string;
  allowedChannelIds?: string[];
  allowedChannelNames?: string[];
  lastError?: string;
  eventCount?: number;
  lastEventAt?: number;
};

export type SaveSlackSigningSecretResult = {
  last4: string;
};
