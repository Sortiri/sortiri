import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { assertApiKeyInWorkspace } from "./apiKeysLib";
import { getWorkspaceDocByExternalId } from "./workspacesLib";

export function validateIngestKey(ingestKey: string): void {
  const expected = process.env.SORTIRI_DEV_INGEST_KEY;
  if (!expected) {
    throw new Error("Ingest key is not configured");
  }
  if (ingestKey !== expected) {
    throw new Error("Unauthorized");
  }
}

export type ResolveIngestWorkspaceArgs = {
  ingestKey?: string;
  apiKeyId?: Id<"apiKeys">;
  workspaceId: string;
};

export async function resolveIngestWorkspace(
  ctx: Pick<MutationCtx, "db">,
  args: ResolveIngestWorkspaceArgs,
): Promise<Doc<"workspaces">> {
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
