import { describe, expect, it } from "vitest";
import {
  DEFAULT_SLACK_CAPTURE_MODE,
  isBlockedChannel,
  parseSlackConfig,
  shouldProcessSlackEvent,
} from "../../convex/lib/integrations/slackCaptureRules";

describe("slack capture rules", () => {
  it("defaults to manual mentions only", () => {
    expect(parseSlackConfig(undefined).captureMode).toBe(DEFAULT_SLACK_CAPTURE_MODE);
  });

  it("blocks normal messages in manual mode", () => {
    expect(
      shouldProcessSlackEvent({
        captureMode: "manual_mentions_only",
        eventType: "message",
        text: "Decision: ship it",
        isMention: false,
      }),
    ).toBe(false);
  });

  it("allows app mentions", () => {
    expect(
      shouldProcessSlackEvent({
        captureMode: "manual_mentions_only",
        eventType: "app_mention",
        text: "Decision: ship it",
        isMention: true,
      }),
    ).toBe(true);
  });

  it("enforces selected channel allowlist", () => {
    expect(
      isBlockedChannel("C999", undefined, {
        captureMode: "selected_channels",
        allowedChannelIds: ["C123"],
      }),
    ).toBe(true);
  });
});
