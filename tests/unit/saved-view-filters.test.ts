import { describe, expect, it } from "vitest";
import { DEFAULT_VIEW_TEMPLATES } from "../../convex/lib/viewTemplates";
import {
  applyViewFilters,
  eventMatchesViewFilters,
  type SavedViewFilters,
} from "../../convex/lib/viewFilters";
import type { EventRecord } from "../../convex/lib/eventsLib";

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: "event1",
    workspaceId: "ws1",
    source: "github",
    category: "code_change",
    type: "git.push",
    actor: { type: "human", name: "Alex" },
    title: "Push to main",
    importance: "normal",
    visibility: "primary",
    occurredAt: Date.now(),
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("saved view filters", () => {
  it("engineering template filters code/agent/github/cli events", () => {
    const template = DEFAULT_VIEW_TEMPLATES.find((item) => item.type === "engineering")!;
    const events = [
      makeEvent({ category: "code_change", source: "github" }),
      makeEvent({ id: "e2", category: "product_event", source: "sdk" }),
      makeEvent({ id: "e3", category: "agent_action", source: "cursor" }),
      makeEvent({ id: "e4", category: "code_change", source: "manual" }),
    ];

    const filtered = applyViewFilters(events, template.filters);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((event) => event.id)).toEqual(["event1", "e3"]);
  });

  it("product template filters product/decision/customer-related events", () => {
    const template = DEFAULT_VIEW_TEMPLATES.find((item) => item.type === "product")!;
    const events = [
      makeEvent({
        id: "p1",
        category: "product_event",
        source: "sdk",
        entity: { type: "customer", name: "Acme" },
      }),
      makeEvent({ id: "p2", category: "code_change", source: "github" }),
      makeEvent({
        id: "p3",
        category: "company_decision",
        source: "manual",
        entity: { type: "feature", name: "Billing" },
      }),
    ];

    const filtered = applyViewFilters(events, template.filters);
    expect(filtered.map((event) => event.id)).toEqual(["p1", "p3"]);
  });

  it("revenue template filters revenue/customer/payment events", () => {
    const template = DEFAULT_VIEW_TEMPLATES.find((item) => item.type === "revenue")!;
    const events = [
      makeEvent({
        id: "r1",
        category: "revenue_event",
        source: "stripe",
        entity: { type: "payment", name: "pay_1" },
      }),
      makeEvent({ id: "r2", category: "agent_action", source: "cursor" }),
      makeEvent({
        id: "r3",
        category: "product_event",
        source: "sdk",
        entity: { type: "customer", name: "Acme" },
      }),
    ];

    const filtered = applyViewFilters(events, template.filters);
    expect(filtered.map((event) => event.id)).toEqual(["r1", "r3"]);
  });

  it("executive template filters high/critical importance events", () => {
    const template = DEFAULT_VIEW_TEMPLATES.find((item) => item.type === "executive")!;
    const events = [
      makeEvent({ id: "x1", importance: "high", category: "company_decision" }),
      makeEvent({ id: "x2", importance: "normal", category: "company_decision" }),
      makeEvent({ id: "x3", importance: "critical", category: "revenue_event" }),
    ];

    const filtered = applyViewFilters(events, template.filters);
    expect(filtered.map((event) => event.id)).toEqual(["x1", "x3"]);
  });

  it("applies query and visibility filters", () => {
    const filters: SavedViewFilters = {
      visibility: "primary",
      query: "deploy",
    };
    const events = [
      makeEvent({ id: "q1", title: "Production deploy", visibility: "primary" }),
      makeEvent({ id: "q2", title: "Lint run", visibility: "primary" }),
      makeEvent({ id: "q3", title: "Deploy debug logs", visibility: "debug" }),
    ];

    expect(eventMatchesViewFilters(events[0]!, filters)).toBe(true);
    expect(applyViewFilters(events, filters).map((event) => event.id)).toEqual(["q1"]);
  });
});
