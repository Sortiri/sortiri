import { describe, expect, it } from "vitest";
import { hashSetupToken, resolveTokenError } from "../../convex/lib/cliSetupLib";
import type { Doc } from "../../convex/_generated/dataModel";

function tokenDoc(
  overrides: Partial<Doc<"cliSetupTokens">>,
): Doc<"cliSetupTokens"> {
  return {
    _id: "token1" as Doc<"cliSetupTokens">["_id"],
    _creationTime: 0,
    workspaceId: "ws1" as Doc<"cliSetupTokens">["workspaceId"],
    tokenHash: "hash",
    tokenPrefix: "stup_sortiri",
    last4: "1234",
    status: "active",
    expiresAt: Date.now() + 60_000,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("cli setup token helpers", () => {
  it("resolveTokenError detects used token", () => {
    expect(resolveTokenError(tokenDoc({ status: "used" }))).toBe("used");
  });

  it("resolveTokenError detects revoked token", () => {
    expect(resolveTokenError(tokenDoc({ status: "revoked" }))).toBe("revoked");
  });

  it("resolveTokenError detects expired token", () => {
    expect(
      resolveTokenError(tokenDoc({ status: "active", expiresAt: Date.now() - 1000 })),
    ).toBe("expired");
  });

  it("resolveTokenError returns null for valid active token", () => {
    expect(
      resolveTokenError(tokenDoc({ status: "active", expiresAt: Date.now() + 60_000 })),
    ).toBeNull();
  });

  it("hashSetupToken is deterministic for same input", async () => {
    const raw = "stup_sortiri_abc123";
    const a = await hashSetupToken(raw);
    const b = await hashSetupToken(raw);
    expect(a).toBe(b);
  });
});
