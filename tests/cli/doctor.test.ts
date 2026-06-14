import { describe, expect, it } from "vitest";
import { redactSecrets } from "../../packages/sortiri-local/src/redact";

describe("sortiri run redaction", () => {
  it("redacts secrets in command output", () => {
    const output = redactSecrets("OPENAI_API_KEY=sk-secret\nDone");
    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain("sk-secret");
  });
});
