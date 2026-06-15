import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getWorkspaceMembership } from "./authz";
import {
  WEBHOOK_SECRET_PREFIX,
  type CreateGithubWebhookSecretResult,
  type GithubWebhookSecretRecord,
} from "../../src/types/github-integration";

// TODO(future sprint): migrate GitHub webhook secrets to encrypted integrationSecrets table.

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function generateRawWebhookSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `${WEBHOOK_SECRET_PREFIX}_${bytesToHex(bytes)}`;
}

export function docToWebhookSecretRecord(doc: Doc<"githubWebhookSecrets">): GithubWebhookSecretRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    last4: doc.last4,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function getActiveSecretForWorkspace(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
): Promise<Doc<"githubWebhookSecrets"> | null> {
  const docs = await ctx.db
    .query("githubWebhookSecrets")
    .withIndex("by_workspace_status", (q) =>
      q.eq("workspaceId", workspaceDocId).eq("status", "active"),
    )
    .collect();

  return docs.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}

export async function revokeActiveSecretsForWorkspace(
  ctx: DbWriteCtx,
  workspaceDocId: Id<"workspaces">,
): Promise<void> {
  const docs = await ctx.db
    .query("githubWebhookSecrets")
    .withIndex("by_workspace_status", (q) =>
      q.eq("workspaceId", workspaceDocId).eq("status", "active"),
    )
    .collect();

  const now = Date.now();
  for (const doc of docs) {
    await ctx.db.patch(doc._id, {
      status: "revoked",
      updatedAt: now,
    });
  }
}

export async function createWebhookSecretDoc(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    secret: string;
    last4: string;
  },
): Promise<Id<"githubWebhookSecrets">> {
  const now = Date.now();
  return ctx.db.insert("githubWebhookSecrets", {
    workspaceId: input.workspaceId,
    secret: input.secret,
    last4: input.last4,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
}

export async function listWebhookSecretsForWorkspace(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
): Promise<GithubWebhookSecretRecord[]> {
  const docs = await ctx.db
    .query("githubWebhookSecrets")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceDocId))
    .order("desc")
    .collect();

  return docs.map(docToWebhookSecretRecord);
}

export async function revokeWebhookSecretDoc(
  ctx: DbWriteCtx,
  secretId: Id<"githubWebhookSecrets">,
): Promise<void> {
  const now = Date.now();
  await ctx.db.patch(secretId, {
    status: "revoked",
    updatedAt: now,
  });
}

export async function assertWebhookSecretAccess(
  ctx: DbReadCtx,
  secretId: Id<"githubWebhookSecrets">,
  userId: string,
): Promise<Doc<"githubWebhookSecrets">> {
  const secret = await ctx.db.get(secretId);
  if (!secret) {
    throw new Error("Webhook secret not found");
  }
  const workspace = await ctx.db.get(secret.workspaceId);
  if (!workspace) {
    throw new Error("Webhook secret not found");
  }
  const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
  if (!membership) {
    throw new Error("Webhook secret not found");
  }
  return secret;
}

export type CreateWebhookSecretOutcome = CreateGithubWebhookSecretResult;
