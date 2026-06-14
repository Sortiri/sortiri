import { describe, expect, it } from "vitest";
import { resolveIngestWorkspaceId } from "../../src/lib/sortiri/ingestAuth";
import type { Id } from "../../convex/_generated/dataModel";

describe("resolveIngestWorkspaceId", () => {
  it("requires workspaceId for dev mode", () => {
    const result = resolveIngestWorkspaceId({ mode: "dev", rawKey: "dev-key" }, undefined);
    expect(result).toEqual({ error: "workspaceId is required", status: 400 });
  });

  it("uses api key workspace over body", () => {
    const result = resolveIngestWorkspaceId(
      {
        mode: "apiKey",
        rawKey: "key",
        workspaceExternalId: "ws-from-key",
        apiKeyId: "key1" as Id<"apiKeys">,
      },
      "ws-from-body",
    );
    expect(result).toEqual({ error: "Workspace mismatch", status: 403 });
  });

  it("accepts api key workspace when body matches or omitted", () => {
    const auth = {
      mode: "apiKey" as const,
      rawKey: "key",
      workspaceExternalId: "ws-from-key",
      apiKeyId: "key1" as Id<"apiKeys">,
    };
    expect(resolveIngestWorkspaceId(auth, undefined)).toEqual({
      workspaceId: "ws-from-key",
    });
    expect(resolveIngestWorkspaceId(auth, "ws-from-key")).toEqual({
      workspaceId: "ws-from-key",
    });
  });

  it("uses body workspace in dev mode", () => {
    const result = resolveIngestWorkspaceId(
      { mode: "dev", rawKey: "dev-key" },
      "ws-body",
    );
    expect(result).toEqual({ workspaceId: "ws-body" });
  });
});
