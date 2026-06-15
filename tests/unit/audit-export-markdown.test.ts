import { describe, expect, it } from "vitest";
import { exportMarkdown } from "@/lib/audits/exportMarkdown";
import { EXPORT_SAFETY_NOTICE } from "@/types/audit-sharing";
import {
  createFixtureWithBlockedArtifact,
  createShareableFixture,
} from "../fixtures/shareable-report";

describe("audit export markdown", () => {
  it("includes title, summary, and safe evidence", () => {
    const output = exportMarkdown(createShareableFixture());
    expect(output).toContain("# Audit Report: Q1 Security Audit");
    expect(output).toContain("This report covers primary timeline events for Q1.");
    expect(output).toContain("### Event: Deploy completed");
    expect(output).toContain("### Artifact: Safe log");
    expect(output).toContain("INFO service started");
  });

  it("includes redaction notice for redacted artifacts", () => {
    const output = exportMarkdown(createShareableFixture());
    expect(output).toContain("Redaction status: redacted");
    expect(output).toContain("Content was redacted before inclusion");
    expect(output).toContain("[REDACTED: SECRET]");
  });

  it("does not include blocked artifact content when excluded from evidence", () => {
    const fixture = createShareableFixture();
    const output = exportMarkdown(fixture);
    expect(output).not.toContain("password=secret");
    expect(output).toContain(EXPORT_SAFETY_NOTICE);
  });

  it("includes evidence overview counts", () => {
    const output = exportMarkdown(createShareableFixture());
    expect(output).toContain("- Events: 1");
    expect(output).toContain("- Artifacts: 2");
    expect(output).toContain("- Blocked Evidence: 1");
  });
});

describe("audit export markdown blocked exclusion", () => {
  it("omits blocked artifact section when not in safe evidence", () => {
    const fixture = createFixtureWithBlockedArtifact();
    const safeOnly = {
      ...fixture,
      items: fixture.items.filter((item) => item.artifactId !== "art_blocked"),
      evidence: {
        ...fixture.evidence,
        artifacts: fixture.evidence.artifacts.filter((a) => a.id !== "art_blocked"),
      },
    };
    const output = exportMarkdown(safeOnly);
    expect(output).not.toContain("Blocked secret");
    expect(output).not.toContain("password=secret");
  });
});
