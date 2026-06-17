import { describe, expect, it } from "vitest";
import {
  assertNotAuditorWorkspaceBrowse,
  canManageSources,
  isAuditorRole,
} from "../../convex/lib/authz";
import type { Doc } from "../../convex/_generated/dataModel";
import { buildReliabilityArgs } from "../../src/lib/sortiri/reliabilityAuth";

describe("reliability permissions", () => {
  it("blocks auditor workspace browse for replay surfaces", () => {
    const membership = { role: "auditor" } as Doc<"workspaceMembers">;
    expect(() => assertNotAuditorWorkspaceBrowse(membership)).toThrow("Access denied");
  });

  it("allows owner and admin to manage sources", () => {
    expect(canManageSources("owner")).toBe(true);
    expect(canManageSources("admin")).toBe(true);
    expect(canManageSources("member")).toBe(false);
    expect(isAuditorRole("auditor")).toBe(true);
  });

  it("builds dev ingest auth args", () => {
    expect(
      buildReliabilityArgs({ mode: "dev", rawKey: "dev-key" }, "ws-ext"),
    ).toEqual({
      workspaceId: "ws-ext",
      ingestKey: "dev-key",
    });
  });

  it("builds api key auth args", () => {
    expect(
      buildReliabilityArgs(
        {
          mode: "apiKey",
          rawKey: "sk_sortiri_test",
          workspaceExternalId: "ws-ext",
          apiKeyId: "key1" as never,
        },
        "ws-ext",
      ),
    ).toEqual({
      workspaceId: "ws-ext",
      apiKeyId: "key1",
    });
  });

  it("builds integration server auth args", () => {
    expect(
      buildReliabilityArgs({
        mode: "integration",
        serverKey: "server-key",
        workspaceExternalId: "ws-ext",
      }),
    ).toEqual({
      serverKey: "server-key",
      workspaceExternalId: "ws-ext",
    });
  });
});
