import { describe, expect, it } from "vitest";
import { redactFailureOutput } from "../../convex/lib/evalRemediation";
import { sanitizeEvalOutput } from "../../convex/lib/evalLib";

describe("remediation safety", () => {
  it("redacts api keys before remediation context", () => {
    const { output, error } = redactFailureOutput(
      "leaked sk-abcdefghijklmnop",
      "Bearer eyJhbGciOiJIUzI1NiJ9",
    );
    expect(output).toContain("[REDACTED]");
    expect(error).toContain("[REDACTED]");
    expect(output).not.toContain("sk-abcdefghijklmnop");
  });

  it("sanitizeEvalOutput redacts password patterns", () => {
    const output = sanitizeEvalOutput('password="supersecret123"');
    expect(output).toContain("[REDACTED]");
  });
});
