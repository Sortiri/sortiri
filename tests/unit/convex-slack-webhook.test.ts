import { describe, expect, it } from "vitest";
import { isUrlVerification } from "../../convex/lib/integrations/slackMapWebhook";

describe("convex slack webhook routing", () => {
  it("identifies url_verification before signature checks", () => {
    const payload = { type: "url_verification", challenge: "challenge-token" };
    expect(isUrlVerification(payload)).toBe(true);
  });

  it("rejects non-verification payloads", () => {
    expect(isUrlVerification({ type: "event_callback", event_id: "Ev1" })).toBe(false);
  });
});
