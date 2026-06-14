import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getWorkspaceMembership } from "./authz";
import { API_KEY_PREFIX, type ApiKeyRecord } from "../../src/types/api-keys";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashApiKey(rawKey: string): Promise<string> {
  const data = new TextEncoder().encode(rawKey);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

export function generateRawApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `${API_KEY_PREFIX}_${bytesToHex(bytes)}`;
}

export function docToApiKeyRecord(doc: Doc<"apiKeys">): ApiKeyRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    name: doc.name,
    keyPrefix: doc.keyPrefix,
    last4: doc.last4,
    status: doc.status,
    lastUsedAt: doc.lastUsedAt,
    revokedAt: doc.revokedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function verifyApiKeyByRawKey(
  ctx: DbReadCtx,
  rawKey: string,
): Promise<
  | { valid: true; apiKeyId: Id<"apiKeys">; workspaceDoc: Doc<"workspaces"> }
  | { valid: false; revoked?: boolean }
> {
  if (!rawKey.startsWith(`${API_KEY_PREFIX}_`)) {
    return { valid: false };
  }

  const keyHash = await hashApiKey(rawKey);
  const doc = await ctx.db
    .query("apiKeys")
    .withIndex("by_key_hash", (q) => q.eq("keyHash", keyHash))
    .unique();

  if (!doc) {
    return { valid: false };
  }

  if (doc.status === "revoked") {
    return { valid: false, revoked: true };
  }

  const workspaceDoc = await ctx.db.get(doc.workspaceId);
  if (!workspaceDoc) {
    return { valid: false };
  }

  return {
    valid: true,
    apiKeyId: doc._id,
    workspaceDoc,
  };
}

export async function assertApiKeyInWorkspace(
  ctx: DbReadCtx,
  apiKeyId: Id<"apiKeys">,
  workspaceDocId: Id<"workspaces">,
): Promise<Doc<"apiKeys">> {
  const apiKey = await ctx.db.get(apiKeyId);
  if (!apiKey || apiKey.workspaceId !== workspaceDocId) {
    throw new Error("Invalid API key");
  }
  if (apiKey.status !== "active") {
    throw new Error("API key revoked");
  }
  return apiKey;
}

export async function createApiKeyDoc(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    name: string;
    keyHash: string;
    last4: string;
    createdBy?: Doc<"apiKeys">["createdBy"];
  },
): Promise<Id<"apiKeys">> {
  const now = Date.now();
  return ctx.db.insert("apiKeys", {
    workspaceId: input.workspaceId,
    name: input.name,
    keyPrefix: API_KEY_PREFIX,
    keyHash: input.keyHash,
    last4: input.last4,
    status: "active",
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
}

export async function listApiKeysForWorkspace(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
): Promise<ApiKeyRecord[]> {
  const docs = await ctx.db
    .query("apiKeys")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceDocId))
    .order("desc")
    .collect();

  return docs.map(docToApiKeyRecord);
}

export async function revokeApiKeyDoc(
  ctx: DbWriteCtx,
  apiKeyId: Id<"apiKeys">,
): Promise<void> {
  const now = Date.now();
  await ctx.db.patch(apiKeyId, {
    status: "revoked",
    revokedAt: now,
    updatedAt: now,
  });
}

export async function markApiKeyUsedDoc(
  ctx: DbWriteCtx,
  apiKeyId: Id<"apiKeys">,
): Promise<void> {
  const now = Date.now();
  await ctx.db.patch(apiKeyId, {
    lastUsedAt: now,
    updatedAt: now,
  });
}

export async function createApiKeyForCliSetup(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    projectName: string;
  },
): Promise<{ apiKeyId: Id<"apiKeys">; rawKey: string; last4: string }> {
  const rawKey = generateRawApiKey();
  const keyHash = await hashApiKey(rawKey);
  const last4 = rawKey.slice(-4);
  const apiKeyId = await createApiKeyDoc(ctx, {
    workspaceId: input.workspaceId,
    name: `CLI Ingest Key — ${input.projectName}`,
    keyHash,
    last4,
    createdBy: {
      name: "Sortiri CLI",
    },
  });
  return { apiKeyId, rawKey, last4 };
}

export async function assertApiKeyAccess(
  ctx: DbReadCtx,
  apiKeyId: Id<"apiKeys">,
  userId: string,
): Promise<Doc<"apiKeys">> {
  const apiKey = await ctx.db.get(apiKeyId);
  if (!apiKey) {
    throw new Error("API key not found");
  }
  const workspace = await ctx.db.get(apiKey.workspaceId);
  if (!workspace) {
    throw new Error("API key not found");
  }
  const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
  if (!membership) {
    throw new Error("API key not found");
  }
  return apiKey;
}
