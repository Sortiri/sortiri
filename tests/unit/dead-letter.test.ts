import { describe, expect, it } from "vitest";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import {
  createDeadLetter,
  docToDeadLetterSummary,
} from "../../convex/lib/ingestDeadLetterLib";

describe("ingest dead letters", () => {
  it("creates dead letter row", async () => {
    let inserted: Record<string, unknown> = {};
    const ctx = {
      db: {
        insert: async (_table: string, row: Record<string, unknown>) => {
          inserted = row;
          return "dl1" as Id<"ingestDeadLetters">;
        },
      },
    };

    const id = await createDeadLetter(ctx as never, {
      workspaceId: "ws1" as Id<"workspaces">,
      envelopeId: "env-1",
      idempotencyKey: "ws1:cli:evt-1",
      source: "cli",
      sourceEventId: "evt-1",
      reason: "max_retries_exceeded",
      error: "write failed",
      attempts: 3,
    });

    expect(id).toBe("dl1");
    expect(inserted.status).toBe("open");
    expect(inserted.reason).toBe("max_retries_exceeded");
  });

  it("maps dead letter doc to summary", () => {
    const doc = {
      _id: "dl1" as Id<"ingestDeadLetters">,
      workspaceId: "ws1" as Id<"workspaces">,
      envelopeId: "env-1",
      idempotencyKey: "ws1:cli:evt-1",
      source: "cli",
      sourceEventId: "evt-1",
      reason: "forced_dead_letter",
      attempts: 1,
      status: "open" as const,
      createdAt: 1,
      updatedAt: 2,
    } as Doc<"ingestDeadLetters">;

    const summary = docToDeadLetterSummary(doc);
    expect(summary.id).toBe("dl1");
    expect(summary.source).toBe("cli");
    expect(summary.status).toBe("open");
  });
});
