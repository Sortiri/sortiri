import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getWorkspaceMembership } from "./authz";
import {
  SETUP_TOKEN_PREFIX,
  type CliSetupTokenRecord,
  type CliSetupTokenStatus,
} from "../../src/types/cli-setup";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

const SETUP_TOKEN_TTL_MS = 10 * 60 * 1000;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashSetupToken(rawToken: string): Promise<string> {
  const data = new TextEncoder().encode(rawToken);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

export function generateRawSetupToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `${SETUP_TOKEN_PREFIX}_${bytesToHex(bytes)}`;
}

export function getSetupTokenExpiry(): number {
  return Date.now() + SETUP_TOKEN_TTL_MS;
}

export function docToCliSetupTokenRecord(
  doc: Doc<"cliSetupTokens">,
  workspaceExternalId: string,
): CliSetupTokenRecord {
  return {
    id: doc._id,
    workspaceId: workspaceExternalId,
    tokenPrefix: doc.tokenPrefix,
    last4: doc.last4,
    status: doc.status,
    expiresAt: doc.expiresAt,
    usedAt: doc.usedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function createSetupTokenDoc(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    tokenHash: string;
    last4: string;
    expiresAt: number;
    createdBy?: Doc<"cliSetupTokens">["createdBy"];
  },
): Promise<Id<"cliSetupTokens">> {
  const now = Date.now();
  return ctx.db.insert("cliSetupTokens", {
    workspaceId: input.workspaceId,
    tokenHash: input.tokenHash,
    tokenPrefix: SETUP_TOKEN_PREFIX,
    last4: input.last4,
    status: "active",
    expiresAt: input.expiresAt,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
}

export async function findTokenByHash(
  ctx: DbReadCtx,
  tokenHash: string,
): Promise<Doc<"cliSetupTokens"> | null> {
  return ctx.db
    .query("cliSetupTokens")
    .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
    .unique();
}

export async function markTokenUsed(
  ctx: DbWriteCtx,
  tokenId: Id<"cliSetupTokens">,
): Promise<void> {
  const now = Date.now();
  await ctx.db.patch(tokenId, {
    status: "used",
    usedAt: now,
    updatedAt: now,
  });
}

export async function markTokenExpired(
  ctx: DbWriteCtx,
  tokenId: Id<"cliSetupTokens">,
): Promise<void> {
  const now = Date.now();
  await ctx.db.patch(tokenId, {
    status: "expired",
    updatedAt: now,
  });
}

export async function revokeSetupTokenDoc(
  ctx: DbWriteCtx,
  tokenId: Id<"cliSetupTokens">,
): Promise<void> {
  const now = Date.now();
  await ctx.db.patch(tokenId, {
    status: "revoked",
    updatedAt: now,
  });
}

export function resolveTokenError(
  doc: Doc<"cliSetupTokens">,
  now = Date.now(),
): "expired" | "used" | "revoked" | null {
  if (doc.status === "used") return "used";
  if (doc.status === "revoked") return "revoked";
  if (doc.status === "expired" || doc.expiresAt <= now) return "expired";
  return null;
}

export async function assertSetupTokenAccess(
  ctx: DbReadCtx,
  tokenId: Id<"cliSetupTokens">,
  userId: string,
): Promise<Doc<"cliSetupTokens">> {
  const token = await ctx.db.get(tokenId);
  if (!token) {
    throw new Error("Setup token not found");
  }
  const workspace = await ctx.db.get(token.workspaceId);
  if (!workspace) {
    throw new Error("Setup token not found");
  }
  const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
  if (!membership) {
    throw new Error("Setup token not found");
  }
  return token;
}

export function maskTokenStatus(
  doc: Doc<"cliSetupTokens">,
  now = Date.now(),
): CliSetupTokenStatus {
  if (doc.status === "active" && doc.expiresAt <= now) {
    return "expired";
  }
  return doc.status;
}
