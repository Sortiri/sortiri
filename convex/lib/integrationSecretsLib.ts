import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { maskSecretForSource } from "./secretsLib";
import type { IntegrationCreatedBy, IntegrationSource } from "./integrationConnectionsLib";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type IntegrationSecretRecord = {
  id: string;
  workspaceId: string;
  source: IntegrationSource;
  maskedSecret: string;
  secretLast4: string;
  status: "active" | "revoked";
  createdAt: number;
  updatedAt: number;
};

export function docToIntegrationSecretRecord(
  doc: Doc<"integrationSecrets">,
): IntegrationSecretRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    source: doc.source,
    maskedSecret: maskSecretForSource(doc.secretLast4, doc.source),
    secretLast4: doc.secretLast4,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function getActiveIntegrationSecret(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  source: IntegrationSource,
): Promise<Doc<"integrationSecrets"> | null> {
  const docs = await ctx.db
    .query("integrationSecrets")
    .withIndex("by_workspace_source", (q) =>
      q.eq("workspaceId", workspaceId).eq("source", source),
    )
    .collect();

  return (
    docs
      .filter((doc) => doc.status === "active")
      .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
  );
}

export async function revokeActiveIntegrationSecrets(
  ctx: DbWriteCtx,
  workspaceId: Id<"workspaces">,
  source: IntegrationSource,
): Promise<void> {
  const docs = await ctx.db
    .query("integrationSecrets")
    .withIndex("by_workspace_source", (q) =>
      q.eq("workspaceId", workspaceId).eq("source", source),
    )
    .collect();

  const now = Date.now();
  for (const doc of docs) {
    if (doc.status !== "active") continue;
    await ctx.db.patch(doc._id, {
      status: "revoked",
      revokedAt: now,
      updatedAt: now,
    });
  }
}

export async function createIntegrationSecretDoc(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    connectionId?: Id<"integrationConnections">;
    source: IntegrationSource;
    name: string;
    encryptedSecret: string;
    secretLast4: string;
    createdBy?: IntegrationCreatedBy;
  },
): Promise<Id<"integrationSecrets">> {
  const now = Date.now();
  return ctx.db.insert("integrationSecrets", {
    workspaceId: input.workspaceId,
    connectionId: input.connectionId,
    source: input.source,
    name: input.name,
    encryptedSecret: input.encryptedSecret,
    secretLast4: input.secretLast4,
    status: "active",
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
}

export async function revokeIntegrationSecretDoc(
  ctx: DbWriteCtx,
  secretId: Id<"integrationSecrets">,
): Promise<void> {
  const now = Date.now();
  await ctx.db.patch(secretId, {
    status: "revoked",
    revokedAt: now,
    updatedAt: now,
  });
}
