import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Sortiri } from "../../packages/sdk/src/client";
import { SortiriError } from "../../packages/sdk/src/errors";
import { titleFromType } from "../../packages/sdk/src/format";

describe("Sortiri SDK client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const client = new Sortiri({
    apiUrl: "http://localhost:3000",
    apiKey: "sortiri_test_key",
    workspaceId: "ws-test",
    projectId: "proj-test",
  });

  it("titleFromType formats event types", () => {
    expect(titleFromType("user.signed_up")).toBe("User Signed Up");
    expect(titleFromType("trial.started")).toBe("Trial Started");
    expect(titleFromType("feature.used")).toBe("Feature Used");
  });

  it("event() posts generic event payload", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ eventId: "evt_1" }), { status: 200 }),
    );

    const result = await client.event({
      category: "agent_action",
      type: "agent.plan_created",
      actor: { type: "agent", name: "Cursor" },
      title: "Plan created",
    });

    expect(result.eventId).toBe("evt_1");
    const [, init] = vi.mocked(global.fetch).mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.category).toBe("agent_action");
    expect(body.workspaceId).toBe("ws-test");
  });

  it("track() sends product_event", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ eventId: "evt_2" }), { status: 200 }),
    );

    await client.track({ type: "user.signed_up", userId: "user_1" });
    const [, init] = vi.mocked(global.fetch).mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.category).toBe("product_event");
    expect(body.type).toBe("user.signed_up");
    expect(body.title).toBe("User Signed Up");
  });

  it("decision() sends company_decision", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ eventId: "evt_3" }), { status: 200 }),
    );

    await client.decision({ title: "Ship v1", actorName: "Bobby" });
    const [, init] = vi.mocked(global.fetch).mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.category).toBe("company_decision");
    expect(body.type).toBe("decision.made");
  });

  it("revenue() sends revenue_event", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ eventId: "evt_4" }), { status: 200 }),
    );

    await client.revenue({
      type: "payment.received",
      customerId: "cus_123",
      amount: 99,
      currency: "USD",
    });
    const [, init] = vi.mocked(global.fetch).mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.category).toBe("revenue_event");
    expect(body.actor.id).toBe("cus_123");
  });

  it("throws SortiriError on non-2xx", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid API key" }), { status: 401 }),
    );

    await expect(
      client.event({
        category: "product_event",
        type: "user.signed_up",
        actor: { type: "customer", id: "u1" },
        title: "User signed up",
      }),
    ).rejects.toBeInstanceOf(SortiriError);
  });
});
