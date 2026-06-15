import { describe, expect, it } from "vitest";
import { redactSensitiveContent } from "../../packages/sortiri-security/src/redact";
import { applyArtifactSafety, applyEventSafety } from "../../convex/lib/sensitiveContent";

describe("redactSensitiveContent", () => {
  it("uses [REDACTED: TYPE] replacement format", () => {
    const { redacted } = redactSensitiveContent("OPENAI_API_KEY=sk-secret");
    expect(redacted).toContain("[REDACTED: OPENAI_API_KEY]");
    expect(redacted).not.toContain("sk-secret");
  });

  it("leaves benign content unchanged", () => {
    const { redacted, scan } = redactSensitiveContent("Hello world");
    expect(redacted).toBe("Hello world");
    expect(scan.hasSensitiveContent).toBe(false);
  });
});

describe("applyArtifactSafety", () => {
  it("maps critical findings to restricted + needs_review", () => {
    const result = applyArtifactSafety("sk_live_abc123");
    expect(result.sensitivity).toBe("restricted");
    expect(result.redactionStatus).toBe("needs_review");
    expect(result.safeForAudit).toBe(false);
    expect(result.content).toContain("[REDACTED");
  });

  it("maps clean content to internal", () => {
    const result = applyArtifactSafety("plain diff");
    expect(result.sensitivity).toBe("internal");
    expect(result.redactionStatus).toBe("none");
    expect(result.safeForAudit).toBe(true);
  });
});

describe("applyEventSafety", () => {
  it("redacts sensitive titles", () => {
    const result = applyEventSafety({
      title: "Used sk_live_abc123 in deploy",
    });
    expect(result.safeForAudit).toBe(false);
    expect(result.title).toContain("[REDACTED");
  });
});
