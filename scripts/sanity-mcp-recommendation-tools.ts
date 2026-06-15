/**
 * Sprint 34 MCP recommendation tools sanity.
 */

import { SortiriApiClient } from "../packages/mcp/src/client.js";
import {
  assertNoSecrets,
  maskApiKey,
} from "./lib/sanity-recommendation-helpers.js";

export type McpRecommendationsSanityInput = {
  appUrl: string;
  rawApiKey: string;
  workspaceId: string;
  recommendationId: string;
};

export async function runMcpRecommendationsSanity(
  input: McpRecommendationsSanityInput,
): Promise<void> {
  const client = new SortiriApiClient({
    apiUrl: input.appUrl,
    apiKey: input.rawApiKey,
    workspaceId: input.workspaceId,
    projectId: "",
  });

  const listed = await client.listRecommendations({ limit: 20 });
  const json = JSON.stringify(listed);
  assertNoSecrets(json);
  if (!Array.isArray(listed.recommendations)) {
    throw new Error("sortiri_list_recommendations missing recommendations array");
  }

  const detail = await client.getRecommendation(input.recommendationId);
  assertNoSecrets(JSON.stringify(detail));
  if (!detail.recommendation?.id) {
    throw new Error("sortiri_get_recommendation missing recommendation");
  }

  const generated = await client.generateRecommendations();
  if (typeof generated.count !== "number") {
    throw new Error("sortiri_generate_recommendations missing count");
  }

  console.log(`  [PASS] MCP recommendation tools passed (${maskApiKey(input.rawApiKey)})`);
}
