import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { assertApiKeyInWorkspace } from "./apiKeysLib";
import { getWorkspaceDocByExternalId } from "./workspacesLib";
import { validateIngestKey } from "./ingestAuth";

export type ReliabilityWorkspaceArgs = {
  ingestKey?: string;
  apiKeyId?: import("../_generated/dataModel").Id<"apiKeys">;
  workspaceId?: string;
  serverKey?: string;
  workspaceExternalId?: string;
};

export function validateIntegrationServerKey(serverKey: string): void {
  const expected = process.env.SORTIRI_INTEGRATION_SERVER_KEY;
  if (!expected || serverKey !== expected) {
    throw new Error("Unauthorized");
  }
}

export async function resolveReliabilityWorkspace(
  ctx: Pick<QueryCtx, "db">,
  args: ReliabilityWorkspaceArgs,
): Promise<Doc<"workspaces">> {
  if (args.serverKey && args.workspaceExternalId) {
    validateIntegrationServerKey(args.serverKey);
    return getWorkspaceDocByExternalId(ctx, args.workspaceExternalId);
  }

  if (!args.workspaceId) {
    throw new Error("workspaceId is required");
  }

  if (args.apiKeyId) {
    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceId);
    await assertApiKeyInWorkspace(ctx, args.apiKeyId, workspace._id);
    return workspace;
  }

  if (!args.ingestKey) {
    throw new Error("Unauthorized");
  }

  validateIngestKey(args.ingestKey);
  return getWorkspaceDocByExternalId(ctx, args.workspaceId);
}

export function workspaceExternalIdFromDoc(workspace: Doc<"workspaces">): string {
  return workspace.externalId;
}
