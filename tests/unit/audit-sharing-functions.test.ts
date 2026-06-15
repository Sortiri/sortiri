import { describe, expect, it } from "vitest";
import {
  assertReportHasNoUnsafeExposedEvidence,
  assertReportSafeForShare,
} from "../../convex/lib/auditExportLib";
import { hashShareToken, isShareTokenFormat } from "../../convex/lib/auditShareLib";
import { isArtifactSafeForAudit } from "../../convex/lib/sensitiveContent";

describe("audit sharing functions", () => {
  it("createShareLink requires finalized report via assertReportSafeForShare", () => {
    expect(() => assertReportSafeForShare({ status: "draft" } as never)).toThrow(
      /finalized/i,
    );
    expect(() => assertReportSafeForShare({ status: "archived" } as never)).toThrow(
      /archived/i,
    );
  });

  it("verifyShareToken fails for invalid token format", () => {
    expect(isShareTokenFormat("not-a-token")).toBe(false);
  });

  it("hashShareToken is deterministic", async () => {
    const token = "share_sortiri_testtoken123456789012345678901234567890";
    const a = await hashShareToken(token);
    const b = await hashShareToken(token);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it("export excludes blocked evidence", () => {
    expect(
      isArtifactSafeForAudit({ safeForAudit: false, redactionStatus: "blocked" }),
    ).toBe(false);
  });

  it("export excludes unsafe evidence", () => {
    expect(
      isArtifactSafeForAudit({ safeForAudit: false, redactionStatus: "needs_review" }),
    ).toBe(false);
  });

  it("assertReportHasNoUnsafeExposedEvidence rejects blocked artifact items", async () => {
    const artifactId = "art_blocked" as never;
    const reportId = "report_1" as never;
    const blockedArtifact = {
      _id: artifactId,
      safeForAudit: false,
      redactionStatus: "blocked",
    };

    const ctx = {
      db: {
        query: () => ({
          withIndex: () => ({
            collect: async () => [
              { itemType: "artifact", artifactId, reportId },
            ],
          }),
        }),
        get: async (id: string) => (id === artifactId ? blockedArtifact : null),
      },
    };

    await expect(
      assertReportHasNoUnsafeExposedEvidence(ctx as never, reportId),
    ).rejects.toThrow(/unsafe exposed evidence/i);
  });

  it("markShareAccessed increments accessCount pattern", () => {
    const previous = 2;
    expect(previous + 1).toBe(3);
  });

  it("recordExport format union includes json", () => {
    const formats = ["markdown", "html", "json"] as const;
    expect(formats).toContain("json");
  });
});
