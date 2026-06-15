import { v } from "convex/values";
import { internalMutation, mutation, type MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { encryptSecret } from "../lib/secretsLib";
import {
  ensureIntegrationConnection,
  getActiveIntegrationSecret,
  recordIntegrationSystemEvent,
} from "../lib/integrationSharedLib";
import {
  createIntegrationSecretDoc,
  revokeActiveIntegrationSecrets,
} from "../lib/integrationSecretsLib";
import {
  getActiveSecretForWorkspace,
  revokeWebhookSecretDoc,
} from "../lib/githubWebhookSecretsLib";

function validateIntegrationServerKey(serverKey: string): void {
  const expected = process.env.SORTIRI_INTEGRATION_SERVER_KEY;
  if (!expected || serverKey !== expected) {
    throw new Error("Unauthorized");
  }
}

type MigrationResult = {
  workspacesScanned: number;
  activeLegacySecretsFound: number;
  migrated: number;
  skippedExistingEncrypted: number;
  failed: number;
};

async function migrateWorkspaceLegacySecret(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
): Promise<"migrated" | "skipped" | "none"> {
  const existingEncrypted = await getActiveIntegrationSecret(ctx, workspaceId, "github");
  if (existingEncrypted) {
    return "skipped";
  }

  const legacy = await getActiveSecretForWorkspace(ctx, workspaceId);
  if (!legacy) {
    return "none";
  }

  const encryptedSecret = await encryptSecret(legacy.secret);
  const connectionId = await ensureIntegrationConnection(ctx, {
    workspaceId,
    source: "github",
    name: "GitHub",
    status: "connected",
  });

  await revokeActiveIntegrationSecrets(ctx, workspaceId, "github");

  await createIntegrationSecretDoc(ctx, {
    workspaceId,
    connectionId,
    source: "github",
    name: "GitHub Webhook Secret",
    encryptedSecret,
    secretLast4: legacy.last4,
  });

  await revokeWebhookSecretDoc(ctx, legacy._id);

  await recordIntegrationSystemEvent(ctx, {
    workspaceId,
    type: "integration.migrated_to_encrypted_secret",
    title: "GitHub secret migrated to encrypted storage",
    summary: "Legacy GitHub webhook secret was migrated to integrationSecrets.",
  });

  return "migrated";
}

async function runMigration(ctx: MutationCtx): Promise<MigrationResult> {
  const legacySecrets = (await ctx.db.query("githubWebhookSecrets").collect()).filter(
    (doc) => doc.status === "active",
  );

  const workspaceIds = new Set(legacySecrets.map((doc) => doc.workspaceId));
  let migrated = 0;
  let skippedExistingEncrypted = 0;
  let failed = 0;

  for (const workspaceId of workspaceIds) {
    try {
      const result = await migrateWorkspaceLegacySecret(ctx, workspaceId);
      if (result === "migrated") migrated += 1;
      if (result === "skipped") skippedExistingEncrypted += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    workspacesScanned: workspaceIds.size,
    activeLegacySecretsFound: legacySecrets.length,
    migrated,
    skippedExistingEncrypted,
    failed,
  };
}

export const migrateLegacyGithubSecretsInternal = internalMutation({
  args: {},
  handler: async (ctx) => runMigration(ctx),
});

export const migrateLegacyGithubSecrets = mutation({
  args: {
    serverKey: v.string(),
  },
  handler: async (ctx, args) => {
    validateIntegrationServerKey(args.serverKey);
    return runMigration(ctx);
  },
});
