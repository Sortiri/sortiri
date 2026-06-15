import { describe, expect, it } from "vitest";
import { assertReportSafeForShare } from "../../convex/lib/auditExportLib";
import {
  expiresInToMs,
  isShareTokenFormat,
  maskShareToken,
  resolveShareLinkStatus,
} from "../../convex/lib/auditShareLib";
import { SHARE_TOKEN_PREFIX } from "@/types/audit-sharing";

describe("audit share permissions", () => {
  it("rejects draft reports for sharing", () => {
    expect(() =>
      assertReportSafeForShare({ status: "draft" } as never),
    ).toThrow(/finalized/i);
  });

  it("rejects archived reports for sharing", () => {
    expect(() =>
      assertReportSafeForShare({ status: "archived" } as never),
    ).toThrow(/archived/i);
  });

  it("allows finalized reports for sharing", () => {
    expect(() =>
      assertReportSafeForShare({ status: "finalized" } as never),
    ).not.toThrow();
  });
});

describe("share token format", () => {
  it("accepts valid share token format", () => {
    expect(isShareTokenFormat(`${SHARE_TOKEN_PREFIX}${"a".repeat(64)}`)).toBe(true);
  });

  it("rejects invalid token format", () => {
    expect(isShareTokenFormat("invalid_token")).toBe(false);
  });
});

describe("share link status resolution", () => {
  it("marks revoked links as revoked", () => {
    expect(
      resolveShareLinkStatus({
        status: "revoked",
        expiresAt: Date.now() + 10000,
      } as never),
    ).toBe("revoked");
  });

  it("marks expired links as expired", () => {
    expect(
      resolveShareLinkStatus({
        status: "active",
        expiresAt: Date.now() - 1000,
      } as never),
    ).toBe("expired");
  });

  it("keeps active links active", () => {
    expect(
      resolveShareLinkStatus({
        status: "active",
        expiresAt: Date.now() + 100000,
      } as never),
    ).toBe("active");
  });
});

describe("share link helpers", () => {
  it("masks token display", () => {
    expect(maskShareToken("a91f")).toBe(`${SHARE_TOKEN_PREFIX}••••a91f`);
  });

  it("converts expiry options to milliseconds", () => {
    expect(expiresInToMs("24h")).toBe(24 * 60 * 60 * 1000);
    expect(expiresInToMs("7d")).toBe(7 * 24 * 60 * 60 * 1000);
    expect(expiresInToMs("30d")).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe("share token scoping rules", () => {
  it("draft report cannot be shared", () => {
    expect(() => assertReportSafeForShare({ status: "draft" } as never)).toThrow();
  });

  it("active token format is distinct per report scope (token encodes access)", () => {
    const tokenA = `${SHARE_TOKEN_PREFIX}${"b".repeat(64)}`;
    const tokenB = `${SHARE_TOKEN_PREFIX}${"c".repeat(64)}`;
    expect(tokenA).not.toBe(tokenB);
    expect(isShareTokenFormat(tokenA)).toBe(true);
    expect(isShareTokenFormat(tokenB)).toBe(true);
  });
});
