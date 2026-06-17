import { api } from "../../../convex/_generated/api";
import { getIngestConvexClient } from "./ingestApi";
import type { ReliabilityAuthContext } from "./reliabilityAuth";

export async function markApiKeyUsedIfNeeded(auth: ReliabilityAuthContext): Promise<void> {
  if (auth.mode !== "apiKey") {
    return;
  }
  const convex = getIngestConvexClient();
  await convex.mutation(api.apiKeys.markUsed, { apiKeyId: auth.apiKeyId });
}
