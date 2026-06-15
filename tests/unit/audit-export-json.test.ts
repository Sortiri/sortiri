import { describe, expect, it } from "vitest";
import { exportJson } from "@/lib/audits/exportJson";
import { createShareableFixture } from "../fixtures/shareable-report";

describe("audit export json", () => {
  it("has expected manifest shape", () => {
    const manifest = exportJson(createShareableFixture());
    expect(manifest.report.id).toBe("report_1");
    expect(manifest.report.title).toBe("Q1 Security Audit");
    expect(manifest.report.status).toBe("finalized");
    expect(manifest.evidence.events).toHaveLength(1);
    expect(manifest.evidence.artifacts).toHaveLength(2);
    expect(manifest.safety.blockedEvidenceCount).toBe(1);
    expect(manifest.exportedAt).toBeTypeOf("number");
  });

  it("does not include blocked unsafe artifact when filtered from evidence", () => {
    const fixture = createShareableFixture();
    const manifest = exportJson(fixture);
    const blocked = manifest.evidence.artifacts.find((a) => a.id === "art_blocked");
    expect(blocked).toBeUndefined();
  });

  it("includes redaction metadata on redacted artifacts", () => {
    const manifest = exportJson(createShareableFixture());
    const redacted = manifest.evidence.artifacts.find((a) => a.id === "art_redacted");
    expect(redacted?.redactionStatus).toBe("redacted");
    expect(redacted?.content).toContain("[REDACTED");
  });
});
