import { describe, expect, it } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import { findDeliveryByIdempotencyKey } from "../../convex/lib/ingestDeliveryLib";
import { buildIdempotencyKey } from "../../src/lib/reliability/eventEnvelope";

describe("ingest idempotency", () => {
  it("finds delivery by idempotency key", async () => {
    const delivery = {
      _id: "del1" as Id<"ingestDeliveries">,
      idempotencyKey: "ws1:cli:evt-1",
      status: "convex_written" as const,
    };
    const ctx = {
      db: {
        query: () => ({
          withIndex: (_name: string, fn: (q: { eq: (f: string, v: string) => unknown }) => unknown) => {
            fn({ eq: () => ({}) });
            return { unique: async () => delivery };
          },
        }),
      },
    };

    const found = await findDeliveryByIdempotencyKey(ctx as never, "ws1:cli:evt-1");
    expect(found?._id).toBe("del1");
  });

  it("returns null when idempotency key is new", async () => {
    const ctx = {
      db: {
        query: () => ({
          withIndex: () => ({
            unique: async () => null,
          }),
        }),
      },
    };
    const found = await findDeliveryByIdempotencyKey(ctx as never, "ws1:cli:new");
    expect(found).toBeNull();
  });

  it("uses workspace source and event id in key", () => {
    expect(buildIdempotencyKey("ws-ext", "cursor", "evt-99")).toBe(
      "ws-ext:cursor:evt-99",
    );
  });
});
