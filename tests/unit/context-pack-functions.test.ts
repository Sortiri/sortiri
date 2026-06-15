import { describe, expect, it } from "vitest";
import { docToContextPack } from "../../convex/lib/contextPackLib";
import { formatContextPackText } from "../../convex/lib/contextPackFormat";
import type { Doc } from "../../convex/_generated/dataModel";

describe("context pack formatting", () => {
  it("formats pack sections for cursor copy", () => {
    const pack = docToContextPack({
      _id: "pack1",
      _creationTime: Date.now(),
      workspaceId: "ws1",
      title: "Checkout context",
      goal: "Fix Stripe checkout",
      status: "generated",
      request: { timeWindowMs: 30 * 24 * 60 * 60 * 1000 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as Doc<"contextPacks">);

    const text = formatContextPackText(pack, [
      {
        id: "item1",
        workspaceId: "ws1",
        contextPackId: "pack1",
        itemType: "validation_requirement",
        title: "Run Stripe webhook tests",
        summary: "npx tsx scripts/test-stripe-webhook.ts",
        createdAt: Date.now(),
      },
    ]);

    expect(text).toContain("CONTEXT PACK");
    expect(text).toContain("Fix Stripe checkout");
    expect(text).toContain("Validation Requirements");
    expect(text).toContain("Run Stripe webhook tests");
  });
});
