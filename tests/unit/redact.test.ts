import { describe, expect, it } from "vitest";
import { redactSecrets } from "../../packages/sortiri-local/src/redact";

describe("redactSecrets", () => {
  const cases = [
    ["OPENAI_API_KEY=sk-secret123", "[REDACTED: OPENAI_API_KEY]"],
    ["ANTHROPIC_API_KEY=sk-ant-123", "[REDACTED: ANTHROPIC_API_KEY]"],
    ["STRIPE_SECRET_KEY=sk_live_abc", "[REDACTED: STRIPE_SECRET_KEY]"],
    ["token sk_live_abc123", "[REDACTED: STRIPE_SECRET_KEY]"],
    ["token sk_test_abc123", "[REDACTED: STRIPE_TEST_KEY]"],
    ["Authorization: Bearer eyJhbGciOiJIUzI1NiJ9", "[REDACTED: BEARER_TOKEN]"],
    ["password=supersecret", "[REDACTED: PASSWORD]"],
    ["secret=mysecret", "[REDACTED: SECRET]"],
    ["token=abc123", "[REDACTED: TOKEN]"],
  ] as const;

  it.each(cases)("redacts %s", (input, expected) => {
    expect(redactSecrets(input)).toContain(expected);
  });

  it("leaves benign content unchanged", () => {
    expect(redactSecrets("Hello world")).toBe("Hello world");
  });
});
