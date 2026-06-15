import { describe, expect, it } from "vitest";
import { deriveExternalStatus } from "../../convex/integrations/health";

describe("integration health", () => {
  it("returns connected for active secret and events", () => {
    expect(
      deriveExternalStatus({
        hasActiveSecret: true,
        hasEvents: true,
        connectionStatus: "connected",
      }),
    ).toBe("connected");
  });

  it("returns error when metadata has lastError", () => {
    expect(
      deriveExternalStatus({
        hasActiveSecret: true,
        hasEvents: true,
        connectionStatus: "connected",
        lastError: "Invalid signature",
      }),
    ).toBe("error");
  });

  it("returns revoked when connection is revoked", () => {
    expect(
      deriveExternalStatus({
        hasActiveSecret: false,
        hasEvents: false,
        connectionStatus: "revoked",
      }),
    ).toBe("revoked");
  });

  it("returns not_connected without secret or events", () => {
    expect(
      deriveExternalStatus({
        hasActiveSecret: false,
        hasEvents: false,
        connectionStatus: "not_connected",
      }),
    ).toBe("not_connected");
  });

  it("returns connected for event activity without secret", () => {
    expect(
      deriveExternalStatus({
        hasActiveSecret: false,
        hasEvents: true,
        connectionStatus: "not_connected",
      }),
    ).toBe("connected");
  });
});
