import type { Id } from "../../../convex/_generated/dataModel";
import type { IngestAuthContext } from "./ingestApi";

export type ReliabilityAuthContext =
  | IngestAuthContext
  | {
      mode: "integration";
      serverKey: string;
      workspaceExternalId: string;
    };

export function buildReliabilityArgs(
  auth: ReliabilityAuthContext,
  workspaceId?: string,
): {
  workspaceId?: string;
  ingestKey?: string;
  apiKeyId?: Id<"apiKeys">;
  serverKey?: string;
  workspaceExternalId?: string;
} {
  if (auth.mode === "integration") {
    return {
      serverKey: auth.serverKey,
      workspaceExternalId: auth.workspaceExternalId,
    };
  }
  if (auth.mode === "apiKey") {
    return {
      workspaceId: workspaceId ?? auth.workspaceExternalId,
      apiKeyId: auth.apiKeyId,
    };
  }
  return {
    workspaceId: workspaceId ?? "",
    ingestKey: auth.rawKey,
  };
}
