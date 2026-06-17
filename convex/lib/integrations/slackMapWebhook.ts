import {
  extractDecisionCandidateFromText,
  extractRollbackFromText,
  matchesDecisionPattern,
  matchesRollbackPattern,
  redactSlackPreview,
} from "../decisionExtraction";
import type { SlackCaptureMode } from "./slackCaptureRules";
import { shouldProcessSlackEvent } from "./slackCaptureRules";

export type SlackEventPayload = {
  type?: string;
  challenge?: string;
  event_id?: string;
  event?: {
    type?: string;
    text?: string;
    user?: string;
    channel?: string;
    ts?: string;
    thread_ts?: string;
    reaction?: string;
    item?: { type?: string; channel?: string; ts?: string };
  };
};

export type MappedSlackIngest = {
  source: "slack";
  category: "system_event";
  type: string;
  actor: { type: "human"; name: string; id?: string };
  title: string;
  summary?: string;
  data?: Record<string, unknown>;
  occurredAt?: number;
  sourceEventId: string;
  text?: string;
  channelId?: string;
  isDecisionCandidate: boolean;
  isRollback: boolean;
};

export function isUrlVerification(payload: SlackEventPayload): payload is { type: "url_verification"; challenge: string } {
  return payload.type === "url_verification" && typeof payload.challenge === "string";
}

export function mapSlackWebhook(
  payload: SlackEventPayload,
  config: {
    captureMode: SlackCaptureMode;
    allowedChannelIds?: string[];
    allowedChannelNames?: string[];
  },
): MappedSlackIngest | null | "blocked" {
  if (payload.type !== "event_callback" || !payload.event) {
    return null;
  }

  const event = payload.event;
  const eventType = event.type ?? "unknown";
  const text = event.text ?? "";
  const channelId = event.channel;
  const isMention = eventType === "app_mention";

  const shouldProcess = shouldProcessSlackEvent({
    captureMode: config.captureMode,
    eventType,
    text,
    isMention,
    channelId,
    allowedChannelIds: config.allowedChannelIds,
    allowedChannelNames: config.allowedChannelNames,
  });

  if (!shouldProcess) {
    if (config.captureMode === "selected_channels" && channelId) {
      return "blocked";
    }
    return null;
  }

  if (
    config.captureMode === "decision_keywords" &&
    eventType === "message" &&
    text &&
    !matchesDecisionPattern(text) &&
    !matchesRollbackPattern(text)
  ) {
    return null;
  }

  const sourceEventId = payload.event_id ?? `slack:${event.ts ?? crypto.randomUUID()}`;
  const preview = redactSlackPreview(text || `Slack ${eventType}`);
  const decision = extractDecisionCandidateFromText(text);
  const rollback = extractRollbackFromText(text);

  return {
    source: "slack",
    category: "system_event",
    type: rollback ? "slack.rollback_detected" : decision ? "slack.decision_candidate" : "slack.message_received",
    actor: { type: "human", name: event.user ? `Slack user ${event.user}` : "Slack", id: event.user },
    title: decision?.title ?? rollback?.title ?? `Slack ${eventType}`,
    summary: preview,
    data: {
      channelId,
      messageTs: event.ts,
      threadTs: event.thread_ts,
      eventType,
      preview,
    },
    occurredAt: event.ts ? Number.parseFloat(event.ts) * 1000 : Date.now(),
    sourceEventId,
    text,
    channelId,
    isDecisionCandidate: Boolean(decision),
    isRollback: Boolean(rollback),
  };
}
