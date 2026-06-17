/**
 * Sprint 37 MCP reliability tools sanity.
 */

import { assertNoSecrets, maskApiKey } from "./lib/sanity-reliability-helpers.js";
import { SortiriApiClient } from "../packages/mcp/src/client.js";

export type McpReliabilitySanityInput = {
  appUrl: string;
  rawApiKey: string;
  workspaceId: string;
  deliveryId?: string;
};

export async function runMcpReliabilitySanity(
  input: McpReliabilitySanityInput,
): Promise<void> {
  const client = new SortiriApiClient({
    apiUrl: input.appUrl,
    apiKey: input.rawApiKey,
    workspaceId: input.workspaceId,
  });

  const requestWithRetry = async <T>(fn: () => Promise<T>, label: string): Promise<T> => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
    throw new Error(`${label}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  };

  const deliveries = await requestWithRetry(
    () => client.listIngestDeliveries({ limit: 20 }),
    "listIngestDeliveries",
  );
  assertNoSecrets(JSON.stringify(deliveries));

  const deadLetters = await requestWithRetry(
    () => client.listDeadLetters({ limit: 20 }),
    "listDeadLetters",
  );
  assertNoSecrets(JSON.stringify(deadLetters));

  const health = await requestWithRetry(() => client.getSourceHealth(), "getSourceHealth");
  assertNoSecrets(JSON.stringify(health));

  if (input.deliveryId) {
    const delivery = await client.getIngestDelivery(input.deliveryId);
    assertNoSecrets(JSON.stringify(delivery));
    const row = delivery.delivery as { eventId?: string } | null;
    if (!row?.eventId) {
      await client.replayIngestDelivery({ deliveryId: input.deliveryId });
    }
  }

  console.log(`  [PASS] MCP reliability tools (${maskApiKey(input.rawApiKey)})`);
}
