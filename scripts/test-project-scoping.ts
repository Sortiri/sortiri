/**
 * Project scoping smoke test.
 *
 * Usage: npm run test:project-scoping
 */

import { listEntitiesByProject } from "../convex/lib/projectPulse";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function main() {
  const mockCtx = {
    db: {
      query: () => ({
        withIndex: () => ({
          order: () => ({
            take: async () => [],
          }),
        }),
      }),
      get: async () => null,
    },
  };

  const entities = await listEntitiesByProject(
    mockCtx as never,
    "workspace1" as never,
    "project1" as never,
  );
  assert(entities.length === 0, "listEntitiesByProject returns [] with no project events");

  console.log("test-project-scoping: all checks passed");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
