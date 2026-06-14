import { describe, expect, it } from "vitest";
import {
  eventMatchesEntity,
  extractEntitiesFromEvent,
  normalizeEntityKey,
} from "../../convex/lib/entitiesLib";

describe("entity extraction", () => {
  it("extracts file entity from watcher event", () => {
    const entities = extractEntitiesFromEvent({
      source: "watcher",
      category: "code_change",
      type: "file.changed",
      actor: { type: "system", name: "Sortiri Watcher" },
      entity: { type: "file", name: "app/page.tsx" },
    });
    expect(entities.some((e) => e.type === "file" && e.key === "app/page.tsx")).toBe(true);
    expect(entities.some((e) => e.type === "actor")).toBe(true);
    expect(entities.some((e) => e.type === "source" && e.key === "watcher")).toBe(true);
  });

  it("extracts GitHub PR entity", () => {
    const entities = extractEntitiesFromEvent({
      source: "github",
      category: "code_change",
      type: "github.pull_request.opened",
      actor: { type: "human", name: "octocat", id: "1" },
      entity: {
        type: "pull_request",
        name: "#42 Update homepage",
        url: "https://github.com/sortiri/example/pull/42",
      },
      data: { repo: "sortiri/example", number: 42 },
    });
    expect(entities.some((e) => e.type === "pull_request" && e.key === "sortiri/example#42")).toBe(
      true,
    );
  });

  it("extracts customer and payment from revenue event", () => {
    const entities = extractEntitiesFromEvent({
      source: "sdk",
      category: "revenue_event",
      type: "payment.received",
      actor: { type: "customer", id: "cus_123", name: "Acme" },
      entity: { type: "payment", id: "pi_123", name: "Payment pi_123" },
    });
    expect(entities.some((e) => e.type === "customer" && e.key === "cus_123")).toBe(true);
    expect(entities.some((e) => e.type === "payment" && e.key === "pi_123")).toBe(true);
  });

  it("extracts command entity", () => {
    const entities = extractEntitiesFromEvent({
      source: "cli",
      category: "system_event",
      type: "command.completed",
      actor: { type: "system", name: "Sortiri CLI" },
      data: { command: "npm run build" },
    });
    expect(entities.some((e) => e.type === "command")).toBe(true);
  });

  it("normalizes source keys to lowercase", () => {
    expect(normalizeEntityKey("source", "GitHub")).toBe("github");
  });

  it("matches events to file entities", () => {
    const entity = {
      id: "ent1",
      workspaceId: "ws1",
      type: "file" as const,
      key: "app/page.tsx",
      name: "app/page.tsx",
      eventCount: 1,
      firstSeenAt: 0,
      lastSeenAt: 0,
      createdAt: 0,
      updatedAt: 0,
    };
    expect(
      eventMatchesEntity(
        {
          source: "watcher",
          category: "code_change",
          type: "file.changed",
          actor: { type: "system" },
          entity: { type: "file", name: "app/page.tsx" },
        },
        entity,
      ),
    ).toBe(true);
  });
});
