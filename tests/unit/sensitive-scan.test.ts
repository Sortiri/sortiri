import { describe, expect, it } from "vitest";
import { scanSensitiveContent } from "../../packages/sortiri-security/src/scan";
import { scanSensitiveContent as convexScan } from "../../convex/lib/sensitiveContent";

const cases: Array<{ input: string; type: string; severity: string }> = [
  { input: "OPENAI_API_KEY=sk-secret", type: "openai_api_key", severity: "critical" },
  { input: "ANTHROPIC_API_KEY=sk-ant", type: "anthropic_api_key", severity: "critical" },
  { input: "STRIPE_SECRET_KEY=sk_live_x", type: "stripe_secret_key", severity: "critical" },
  { input: "token sk_live_abc123", type: "stripe_sk", severity: "critical" },
  { input: "token sk_test_abc123", type: "stripe_test_sk", severity: "high" },
  { input: "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.x.y", type: "bearer_token", severity: "high" },
  { input: "password=supersecret", type: "password_assignment", severity: "high" },
  { input: "postgres://user:pass@host/db", type: "database_url", severity: "high" },
];

describe("scanSensitiveContent (@sortiri/security)", () => {
  it.each(cases)("detects $type", ({ input, type, severity }) => {
    const result = scanSensitiveContent(input);
    expect(result.hasSensitiveContent).toBe(true);
    expect(result.findings.some((f) => f.type === type && f.severity === severity)).toBe(true);
  });

  it("returns clean for benign content", () => {
    const result = scanSensitiveContent("Hello world");
    expect(result.hasSensitiveContent).toBe(false);
    expect(result.findings).toEqual([]);
  });
});

describe("scanSensitiveContent (Convex mirror)", () => {
  it.each(cases)("detects $type", ({ input, type, severity }) => {
    const result = convexScan(input);
    expect(result.hasSensitiveContent).toBe(true);
    expect(result.findings.some((f) => f.type === type && f.severity === severity)).toBe(true);
  });
});
