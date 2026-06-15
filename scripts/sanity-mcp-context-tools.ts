/**
 * Sprint 33 MCP context tools sanity — exercises SortiriApiClient (same HTTP surface as MCP tools).
 */

import { SortiriApiClient } from "../packages/mcp/src/client.js";
import {
  assertContextSections,
  assertNoSecrets,
  getAppUrl,
  maskApiKey,
} from "./lib/sanity-context-helpers.js";
import type { Id } from "../convex/_generated/dataModel";

export type McpContextSanityInput = {
  appUrl: string;
  rawApiKey: string;
  workspaceId: string;
  projectId?: Id<"projects">;
  workstreamId?: Id<"workstreams">;
};

export async function runMcpContextSanity(input: McpContextSanityInput): Promise<string> {
  const client = new SortiriApiClient({
    apiUrl: input.appUrl,
    apiKey: input.rawApiKey,
    workspaceId: input.workspaceId,
    projectId: input.projectId ?? "",
  });

  const goal = "Fix Stripe webhook failures";

  const created = await client.createContextPack({
    goal,
    projectId: input.projectId,
    workstreamId: input.workstreamId,
    files: ["src/app/checkout/page.tsx"],
    timeWindowDays: 30,
  });
  if (!created.contextPackId || !created.text) {
    throw new Error("sortiri_create_context_pack missing contextPackId or text");
  }
  assertNoSecrets(created.text);
  assertContextSections(created.text);

  const fetched = await client.getContextPack(created.contextPackId);
  assertNoSecrets(fetched.text);
  if (!fetched.text.includes("CONTEXT PACK")) {
    throw new Error("sortiri_get_context_pack missing formatted text");
  }

  const failures = await client.getKnownFailures({ goal, projectId: input.projectId });
  if (!Array.isArray(failures) || failures.length === 0) {
    throw new Error("sortiri_get_known_failures returned no failures");
  }

  const validations = await client.getValidationRequirements({ goal });
  if (!Array.isArray(validations) || validations.length === 0) {
    throw new Error("sortiri_get_validation_requirements returned no requirements");
  }

  const playbook = await client.getRecommendedPlaybook({ goal, projectId: input.projectId });
  if (!playbook || typeof playbook !== "object") {
    throw new Error("sortiri_get_recommended_playbook returned empty result");
  }

  const projectMemory = await client.getProjectMemory({ query: goal, projectId: input.projectId });
  if (!projectMemory || typeof projectMemory !== "object") {
    throw new Error("sortiri_get_project_memory returned empty result");
  }

  console.log(`  [PASS] MCP context tools passed (${maskApiKey(input.rawApiKey)})`);
  return created.contextPackId;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rawApiKey = process.env.SANITY_CONTEXT_API_KEY?.trim();
  const workspaceId = process.env.SANITY_CONTEXT_WORKSPACE_ID?.trim();
  if (!rawApiKey || !workspaceId) {
    console.error("Set SANITY_CONTEXT_API_KEY and SANITY_CONTEXT_WORKSPACE_ID");
    process.exit(1);
  }
  void runMcpContextSanity({
    appUrl: getAppUrl(),
    rawApiKey,
    workspaceId,
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
