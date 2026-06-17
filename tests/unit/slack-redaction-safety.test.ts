import { describe, expect, it } from "vitest";
import { mapSlackWebhook } from "../../convex/lib/integrations/slackMapWebhook";
import { parseSlackConfig } from "../../convex/lib/integrations/slackCaptureRules";

describe("slack redaction safety", () => {
  const config = parseSlackConfig({ captureMode: "manual_mentions_only" });

  it("does not include raw bearer tokens in mapped preview", () => {
    const payload = {
      type: "event_callback",
      event_id: "Ev1",
      event: {
        type: "app_mention",
        text: "Decision: rotate token xoxb-1234567890",
        channel: "C1",
        user: "U1",
      },
    };

    const mapped = mapSlackWebhook(payload as never, config);
    if (mapped && mapped !== "blocked") {
      expect(mapped.summary).not.toContain("xoxb-");
      expect(JSON.stringify(mapped.data)).not.toContain("xoxb-");
    }
  });
});
