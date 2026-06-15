import { describe, expect, it } from "vitest";
import { parseBearerToken, verifyBearerAuth } from "../../src/lib/integrations/posthog/verifyAuth";

describe("posthog bearer auth", () => {
  it("parses Bearer token from authorization header", () => {
    expect(parseBearerToken("Bearer phsec_sortiri_abc")).toBe("phsec_sortiri_abc");
    expect(parseBearerToken("bearer token-value")).toBe("token-value");
    expect(parseBearerToken("Basic abc")).toBeNull();
    expect(parseBearerToken(null)).toBeNull();
  });

  it("verifies matching secrets with constant-time compare semantics", () => {
    const secret = "phsec_sortiri_test_secret_value_1234";
    expect(verifyBearerAuth(`Bearer ${secret}`, secret)).toBe(true);
    expect(verifyBearerAuth(`Bearer ${secret}x`, secret)).toBe(false);
    expect(verifyBearerAuth("Bearer wrong", secret)).toBe(false);
    expect(verifyBearerAuth(null, secret)).toBe(false);
  });
});
