/**
 * Entity extraction smoke test.
 *
 * Usage: npm run test:entity-extraction
 */

import {
  extractEntitiesFromEvent,
  eventMatchesEntity,
  normalizeEntityKey,
} from "../convex/lib/entitiesLib";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function main() {
  const fileEvent = extractEntitiesFromEvent({
    source: "watcher",
    category: "code_change",
    type: "file.changed",
    actor: { type: "system", name: "Sortiri Watcher" },
    entity: { type: "file", name: "app/page.tsx" },
  });
  assert(
    fileEvent.some((e) => e.type === "file" && e.key === "app/page.tsx"),
    "watcher file entity",
  );
  assert(fileEvent.some((e) => e.type === "actor"), "watcher actor entity");
  assert(fileEvent.some((e) => e.type === "source" && e.key === "watcher"), "watcher source");

  const githubPr = extractEntitiesFromEvent({
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
  assert(
    githubPr.some((e) => e.type === "pull_request" && e.key === "sortiri/example#42"),
    "github PR key",
  );

  const revenue = extractEntitiesFromEvent({
    source: "sdk",
    category: "revenue_event",
    type: "payment.received",
    actor: { type: "customer", id: "cus_123", name: "Acme" },
    entity: { type: "payment", id: "pi_123", name: "Payment pi_123" },
  });
  assert(revenue.some((e) => e.type === "customer" && e.key === "cus_123"), "customer entity");
  assert(revenue.some((e) => e.type === "payment" && e.key === "pi_123"), "payment entity");

  const command = extractEntitiesFromEvent({
    source: "cli",
    category: "system_event",
    type: "command.completed",
    actor: { type: "system", name: "Sortiri CLI" },
    data: { command: "npm run build" },
  });
  assert(command.some((e) => e.type === "command"), "command entity");

  assert(normalizeEntityKey("source", "GitHub") === "github", "source key lowercase");

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

  assert(
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
    "eventMatchesEntity file",
  );

  console.log("All entity extraction tests passed.");
}

main();
