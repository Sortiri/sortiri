/**
 * Sprint 39 MCP decision tools sanity.
 */

import { SortiriApiClient } from "../packages/mcp/src/client.js";

export type McpDecisionToolsSanityInput = {
  apiUrl: string;
  rawApiKey: string;
  workspaceId: string;
};

export async function runMcpDecisionToolsSanity(
  input: McpDecisionToolsSanityInput,
): Promise<void> {
  const client = new SortiriApiClient({
    apiUrl: input.apiUrl,
    apiKey: input.rawApiKey,
    workspaceId: input.workspaceId,
    projectId: "",
  });

  const recorded = await client.recordDecision({
    title: `MCP sanity decision ${Date.now()}`,
    decisionType: "engineering",
  });

  if (!recorded || typeof recorded !== "object") {
    throw new Error("MCP recordDecision returned empty payload");
  }

  const listed = await client.listDecisions({ limit: 5 });
  if (!Array.isArray(listed.decisions)) {
    throw new Error("MCP listDecisions missing decisions array");
  }

  const candidates = await client.listDecisionCandidates({ limit: 5 });
  if (!Array.isArray(candidates.candidates)) {
    throw new Error("MCP listDecisionCandidates missing candidates array");
  }

  console.log("  [PASS] MCP decision tools record/list/candidates");
}
