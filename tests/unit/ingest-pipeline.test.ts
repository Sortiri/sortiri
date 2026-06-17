import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";

const mocks = vi.hoisted(() => ({
  checkIdempotencyViaConvex: vi.fn(),
  registerJournaledDeliveryViaConvex: vi.fn(),
  completeDeliveryWriteViaConvex: vi.fn(),
  markDeliveryRetryPendingViaConvex: vi.fn(),
  createDeadLetterDirectViaConvex: vi.fn(),
  markApiKeyUsedIfNeeded: vi.fn(),
  journalWrite: vi.fn(),
  journalRead: vi.fn(),
}));

vi.mock("@/lib/sortiri/reliabilityApi", () => ({
  checkIdempotencyViaConvex: mocks.checkIdempotencyViaConvex,
  registerJournaledDeliveryViaConvex: mocks.registerJournaledDeliveryViaConvex,
  completeDeliveryWriteViaConvex: mocks.completeDeliveryWriteViaConvex,
  markDeliveryRetryPendingViaConvex: mocks.markDeliveryRetryPendingViaConvex,
  createDeadLetterDirectViaConvex: mocks.createDeadLetterDirectViaConvex,
}));

vi.mock("@/lib/sortiri/ingestPipelineHelpers", () => ({
  markApiKeyUsedIfNeeded: mocks.markApiKeyUsedIfNeeded,
}));

vi.mock("@/lib/reliability/journalFactory", () => ({
  getJournal: () => ({
    write: mocks.journalWrite,
    read: mocks.journalRead,
    list: vi.fn(),
  }),
}));

import {
  readFailureInjection,
  runIngestPipeline,
} from "../../src/lib/reliability/ingestPipeline";

describe("ingest pipeline", () => {
  const auth = { mode: "dev" as const, rawKey: "dev-key" };
  const body = {
    source: "cli" as const,
    sourceEventId: "evt-pipeline-1",
    category: "agent_action" as const,
    type: "pipeline_test",
    actor: { type: "agent" as const, name: "Agent" },
    title: "Pipeline test",
  };
  const req = new Request("http://localhost/ingest/events");

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.journalWrite.mockResolvedValue({
      journalRef: "ws/cli/2026/01/01/env.json",
      checksum: "abc",
    });
    mocks.checkIdempotencyViaConvex.mockResolvedValue({ duplicate: false });
    mocks.registerJournaledDeliveryViaConvex.mockResolvedValue({
      duplicate: false,
      deliveryId: "del1" as Id<"ingestDeliveries">,
    });
    mocks.completeDeliveryWriteViaConvex.mockResolvedValue({
      duplicate: false,
      eventId: "evt1" as Id<"events">,
      status: "convex_written",
    });
    mocks.markApiKeyUsedIfNeeded.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.SORTIRI_ENABLE_FAILURE_INJECTION;
  });

  it("returns duplicate when idempotency check hits", async () => {
    mocks.checkIdempotencyViaConvex.mockResolvedValueOnce({
      duplicate: true,
      deliveryId: "del-dup" as Id<"ingestDeliveries">,
      eventId: "evt-dup" as Id<"events">,
      status: "duplicate",
    });

    const result = await runIngestPipeline({
      auth,
      workspaceId: "ws1",
      body,
      req,
    });

    expect(result.duplicate).toBe(true);
    expect(result.deliveryId).toBe("del-dup");
    expect(mocks.journalWrite).not.toHaveBeenCalled();
  });

  it("journaled delivery completes convex write", async () => {
    const result = await runIngestPipeline({
      auth,
      workspaceId: "ws1",
      body,
      req,
    });

    expect(mocks.journalWrite).toHaveBeenCalled();
    expect(mocks.registerJournaledDeliveryViaConvex).toHaveBeenCalled();
    expect(mocks.completeDeliveryWriteViaConvex).toHaveBeenCalled();
    expect(result.status).toBe("convex_written");
    expect(result.eventId).toBe("evt1");
  });

  it("marks retry pending when convex write fails", async () => {
    mocks.completeDeliveryWriteViaConvex.mockRejectedValueOnce(new Error("Convex down"));
    mocks.markDeliveryRetryPendingViaConvex.mockResolvedValueOnce({ status: "retry_pending" });

    const result = await runIngestPipeline({
      auth,
      workspaceId: "ws1",
      body,
      req,
    });

    expect(mocks.markDeliveryRetryPendingViaConvex).toHaveBeenCalled();
    expect(result.status).toBe("retry_pending");
  });

  it("reads failure injection only in non-production", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SORTIRI_ENABLE_FAILURE_INJECTION", "true");
    const injected = readFailureInjection(
      new Request("http://localhost", {
        headers: { "x-sortiri-test-fail-convex-write": "true" },
      }),
    );
    expect(injected.failConvexWrite).toBe(true);
    vi.unstubAllEnvs();
  });
});
