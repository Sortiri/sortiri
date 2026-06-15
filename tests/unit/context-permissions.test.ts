import { describe, expect, it } from "vitest";
import { formatContextPackText } from "../../convex/lib/contextPackFormat";
import { docToContextPack } from "../../convex/lib/contextPackLib";
import type { Doc } from "../../convex/_generated/dataModel";

describe("context permissions copy", () => {
  it("does not include raw secret placeholders in formatted output", () => {
    const pack = docToContextPack({
      _id: "pack1",
      _creationTime: Date.now(),
      workspaceId: "ws1",
      title: "Safe pack",
      goal: "Audit permissions",
      status: "generated",
      request: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as Doc<"contextPacks">);

    const text = formatContextPackText(pack, [
      {
        id: "item1",
        workspaceId: "ws1",
        contextPackId: "pack1",
        itemType: "artifact",
        title: "Redacted log",
        summary: "This evidence was redacted before storage.",
        createdAt: Date.now(),
      },
    ]);

    expect(text).not.toMatch(/sk-[a-z0-9]+/i);
    expect(text).toContain("redacted");
  });
});
