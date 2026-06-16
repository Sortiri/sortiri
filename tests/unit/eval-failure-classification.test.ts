import { describe, expect, it } from "vitest";
import {
  buildRemediationDedupKey,
  buildRemediationSummary,
  buildRemediationTitle,
  buildValidationRequirementsForFailure,
  classifyEvalFailure,
  isSignificantFailure,
  redactFailureOutput,
} from "../../convex/lib/evalRemediation";

describe("classifyEvalFailure", () => {
  it("classifies command failures with required high priority", () => {
    const result = classifyEvalFailure(
      { type: "command", title: "npm run test:e2e", required: true, config: { command: "npm run test:e2e" } },
      { status: "failed", title: "npm run test:e2e", summary: "exit 1" },
    );
    expect(result.category).toBe("command_failure");
    expect(result.priority).toBe("high");
    expect(result.type).toBe("fix");
  });

  it("classifies stripe webhook failures as critical", () => {
    const result = classifyEvalFailure(
      {
        type: "source_webhook_check",
        title: "Stripe webhook validation",
        required: true,
        config: { source: "stripe" },
      },
      { status: "failed", title: "Stripe webhook", summary: "signature invalid" },
    );
    expect(result.category).toBe("source_webhook_failure");
    expect(result.priority).toBe("critical");
  });

  it("classifies permission failures as critical security review", () => {
    const result = classifyEvalFailure(
      { type: "permission_check", title: "Viewer blocked", required: true, config: {} },
      { status: "failed", title: "permission", summary: "viewer ran eval" },
    );
    expect(result.category).toBe("permission_failure");
    expect(result.priority).toBe("critical");
    expect(result.type).toBe("security_review");
  });

  it("classifies evidence safety failures as critical", () => {
    const result = classifyEvalFailure(
      { type: "evidence_safety_check", title: "Audit safe", required: true, config: {} },
      { status: "failed", title: "evidence", summary: "unsafe artifact" },
    );
    expect(result.category).toBe("evidence_safety_failure");
    expect(result.priority).toBe("critical");
  });

  it("classifies no-secret leak failures as critical", () => {
    const result = classifyEvalFailure(
      { type: "no_secret_leak_check", title: "No secrets", required: true, config: {} },
      { status: "failed", title: "secret leak", summary: "api key found" },
    );
    expect(result.category).toBe("no_secret_leak_failure");
    expect(result.priority).toBe("critical");
  });

  it("classifies http api failures as high", () => {
    const result = classifyEvalFailure(
      { type: "http_api_check", title: "API route", required: true, config: { path: "/api/test" } },
      { status: "failed", title: "http", summary: "401" },
    );
    expect(result.category).toBe("http_api_failure");
    expect(result.priority).toBe("high");
  });

  it("classifies context quality failures", () => {
    const result = classifyEvalFailure(
      { type: "context_quality_check", title: "Context pack", required: false, config: {} },
      { status: "needs_review", title: "context", summary: "missing sections" },
    );
    expect(result.category).toBe("context_quality_failure");
    expect(result.priority).toBe("normal");
  });
});

describe("remediation helpers", () => {
  it("builds stable dedup keys", () => {
    expect(buildRemediationDedupKey("result1" as never)).toBe("eval-remediation:result1");
  });

  it("detects significant failures", () => {
    expect(isSignificantFailure("failed")).toBe(true);
    expect(isSignificantFailure("passed")).toBe(false);
  });

  it("builds remediation title for webhook failure", () => {
    const classification = classifyEvalFailure(
      { type: "source_webhook_check", title: "Stripe webhook", required: true, config: {} },
      { status: "failed", title: "Stripe webhook", summary: "bad" },
    );
    const title = buildRemediationTitle(classification, {
      type: "source_webhook_check",
      title: "Stripe webhook",
    });
    expect(title).toContain("webhook");
  });

  it("builds validation requirements for command failures", () => {
    const classification = classifyEvalFailure(
      { type: "command", title: "test", required: true, config: { command: "npm test" } },
      { status: "failed", title: "test", summary: "fail" },
    );
    const reqs = buildValidationRequirementsForFailure(classification, {
      type: "command",
      title: "test",
      config: { command: "npm test" },
    });
    expect(reqs[0]?.command).toBe("npm test");
  });

  it("redacts secrets in failure output", () => {
    const redacted = redactFailureOutput("token sk-abcdefghijklmnop", undefined);
    expect(redacted.output).toContain("[REDACTED]");
  });

  it("builds cautious remediation summary", () => {
    const classification = classifyEvalFailure(
      { type: "command", title: "test", required: true, config: {} },
      { status: "failed", title: "test", summary: "failed" },
    );
    const summary = buildRemediationSummary(
      classification,
      { type: "command", title: "test", required: true },
      { status: "failed", summary: "failed" },
      "Suite A",
    );
    expect(summary).toContain("may need remediation");
  });
});
