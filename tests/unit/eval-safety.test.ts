import { describe, expect, it } from "vitest";
import { sanitizeEvalOutput } from "../../convex/lib/evalLib";
import { assertNoSecretsInText } from "../../scripts/lib/eval-case-executors";

describe("sanitizeEvalOutput", () => {
  it("redacts stripe-style keys", () => {
    const output = sanitizeEvalOutput("token sk-abcdefghijklmnop in output");
    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain("sk-abcdefghijklmnop");
  });

  it("redacts bearer tokens", () => {
    const output = sanitizeEvalOutput("Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    expect(output).toContain("[REDACTED]");
  });

  it("truncates very long output", () => {
    const long = "x".repeat(9000);
    const output = sanitizeEvalOutput(long);
    expect(output!.length).toBeLessThan(9000);
    expect(output).toContain("...[truncated]");
  });

  it("returns undefined for empty output", () => {
    expect(sanitizeEvalOutput(undefined)).toBeUndefined();
    expect(sanitizeEvalOutput("")).toBe("");
  });
});

describe("assertNoSecretsInText", () => {
  it("passes for safe text", () => {
    expect(() => assertNoSecretsInText("npm run test:unit passed")).not.toThrow();
  });

  it("throws when secret patterns are present", () => {
    expect(() => assertNoSecretsInText("leaked sk-abcdefghijklmnop")).toThrow(
      /Secret pattern detected/,
    );
    expect(() => assertNoSecretsInText("api_key=supersecretvalue123")).toThrow(
      /Secret pattern detected/,
    );
  });
});
