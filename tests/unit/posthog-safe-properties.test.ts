import { describe, expect, it } from "vitest";
import { selectPostHogSafeProperties } from "../../src/lib/integrations/posthog/safeProperties";

describe("posthog safe properties", () => {
  it("allowlists safe product analytics fields", () => {
    const safe = selectPostHogSafeProperties({
      $email: "user@example.com",
      $pathname: "/timeline",
      utm_source: "newsletter",
      feature: "timeline",
      plan: "pro",
    });
    expect(safe).toEqual({
      email: "user@example.com",
      pathname: "/timeline",
      utm_source: "newsletter",
      feature: "timeline",
      plan: "pro",
    });
  });

  it("redacts unsafe fields like password, phone, and ip", () => {
    const safe = selectPostHogSafeProperties({
      $email: "user@example.com",
      password: "secret",
      phone: "555-1234",
      ip_address: "127.0.0.1",
      credit_card: "4111",
      token: "abc",
    });
    expect(safe).toEqual({ email: "user@example.com" });
    expect(safe).not.toHaveProperty("password");
    expect(safe).not.toHaveProperty("phone");
  });
});
