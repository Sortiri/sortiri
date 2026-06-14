import { describe, expect, it } from "vitest";
import { redactSecrets } from "../../packages/sortiri-local/src/redact";

describe("redactSecrets", () => {
  const cases = [
    ["OPENAI_API_KEY=sk-secret123", "[REDACTED]"],
    ["ANTHROPIC_API_KEY=sk-ant-123", "[REDACTED]"],
    ["STRIPE_SECRET_KEY=sk_live_abc", "[REDACTED]"],
    ["token sk_live_abc123", "[REDACTED]"],
    ["token sk_test_abc123", "[REDACTED]"],
    ["Authorization: Bearer eyJhbGciOiJIUzI1NiJ9", "[REDACTED]"],
    ["password=supersecret", "[REDACTED]"],
    ["secret=mysecret", "[REDACTED]"],
    ["token=abc123", "[REDACTED]"],
  ] as const;

  it.each(cases)("redacts %s", (input, expected) => {
    expect(redactSecrets(input)).toContain(expected);
  });

  it("leaves benign content unchanged", () => {
    expect(redactSecrets("Hello world")).toBe("Hello world");
  });
});
