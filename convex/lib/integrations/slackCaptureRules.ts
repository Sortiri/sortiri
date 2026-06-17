export type SlackCaptureMode =
  | "manual_mentions_only"
  | "decision_keywords"
  | "selected_channels";

export type SlackConfig = {
  captureMode: SlackCaptureMode;
  allowedChannelIds?: string[];
  allowedChannelNames?: string[];
  decisionReactionEmojis?: string[];
};

export const DEFAULT_SLACK_CAPTURE_MODE: SlackCaptureMode = "manual_mentions_only";

export const DEFAULT_DECISION_REACTIONS = ["white_check_mark", "bookmark", "pushpin"];

export function parseSlackConfig(metadata: unknown): SlackConfig {
  const raw = metadata as Partial<SlackConfig> | undefined;
  return {
    captureMode: raw?.captureMode ?? DEFAULT_SLACK_CAPTURE_MODE,
    allowedChannelIds: raw?.allowedChannelIds,
    allowedChannelNames: raw?.allowedChannelNames,
    decisionReactionEmojis: raw?.decisionReactionEmojis ?? DEFAULT_DECISION_REACTIONS,
  };
}

export function isChannelAllowed(
  channelId: string | undefined,
  channelName: string | undefined,
  config: SlackConfig,
): boolean {
  if (!config.allowedChannelIds?.length && !config.allowedChannelNames?.length) {
    return true;
  }
  if (channelId && config.allowedChannelIds?.includes(channelId)) return true;
  if (channelName && config.allowedChannelNames?.includes(channelName)) return true;
  return false;
}

export function isBlockedChannel(
  channelId: string | undefined,
  channelName: string | undefined,
  config: SlackConfig,
): boolean {
  if (config.captureMode !== "selected_channels") return false;
  return !isChannelAllowed(channelId, channelName, config);
}

export function shouldProcessSlackEvent(input: {
  captureMode: SlackCaptureMode;
  eventType: string;
  text?: string;
  isMention: boolean;
  channelId?: string;
  channelName?: string;
  allowedChannelIds?: string[];
  allowedChannelNames?: string[];
}): boolean {
  const config: SlackConfig = {
    captureMode: input.captureMode,
    allowedChannelIds: input.allowedChannelIds,
    allowedChannelNames: input.allowedChannelNames,
  };

  if (isBlockedChannel(input.channelId, input.channelName, config)) {
    return false;
  }

  if (input.eventType === "app_mention") {
    return true;
  }

  if (input.captureMode === "manual_mentions_only") {
    return false;
  }

  if (input.captureMode === "selected_channels") {
    if (!isChannelAllowed(input.channelId, input.channelName, config)) {
      return false;
    }
  }

  if (input.eventType === "message" && input.text) {
    return true;
  }

  if (input.eventType === "reaction_added") {
    return true;
  }

  return false;
}
