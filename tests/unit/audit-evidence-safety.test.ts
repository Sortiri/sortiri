import { describe, expect, it } from "vitest";
import {
  isArtifactSafeForAudit,
  isEventSafeForAudit,
} from "../../convex/lib/sensitiveContent";

describe("audit evidence safety helpers", () => {
  it("treats blocked artifacts as unsafe for audit", () => {
    expect(
      isArtifactSafeForAudit({ safeForAudit: false, redactionStatus: "blocked" }),
    ).toBe(false);
  });

  it("allows approved artifacts with safeForAudit true", () => {
    expect(
      isArtifactSafeForAudit({ safeForAudit: true, redactionStatus: "approved" }),
    ).toBe(true);
  });

  it("excludes events with safeForAudit false", () => {
    expect(
      isEventSafeForAudit({ safeForAudit: false, redactionStatus: "redacted" }),
    ).toBe(false);
  });

  it("excludes blocked events", () => {
    expect(
      isEventSafeForAudit({ safeForAudit: true, redactionStatus: "blocked" }),
    ).toBe(false);
  });
});
