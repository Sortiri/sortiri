import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type {
  AuditShareLinkRecord,
  AuditShareLinkStatus,
  ShareLinkExpiry,
} from "../../src/types/audit-sharing";
import { SHARE_TOKEN_PREFIX } from "../../src/types/audit-sharing";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashShareToken(rawToken: string): Promise<string> {
  const data = new TextEncoder().encode(rawToken);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

export function generateShareToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `${SHARE_TOKEN_PREFIX}${bytesToHex(bytes)}`;
}

export function getTokenLast4(token: string): string {
  return token.slice(-4);
}

export function expiresInToMs(expiresIn: ShareLinkExpiry): number {
  switch (expiresIn) {
    case "24h":
      return 24 * MS_PER_HOUR;
    case "7d":
      return 7 * MS_PER_DAY;
    case "30d":
      return 30 * MS_PER_DAY;
    default:
      return 7 * MS_PER_DAY;
  }
}

export function buildShareUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/share/audit/${token}`;
}

export async function findShareLinkByHash(
  ctx: DbReadCtx,
  tokenHash: string,
): Promise<Doc<"auditShareLinks"> | null> {
  const links = await ctx.db
    .query("auditShareLinks")
    .withIndex("by_token_prefix", (q) => q.eq("tokenPrefix", SHARE_TOKEN_PREFIX))
    .collect();
  const matches = links.filter((row) => row.tokenHash === tokenHash);
  if (!matches.length) return null;
  const active = matches.find((row) => resolveShareLinkStatus(row) === "active");
  return active ?? matches.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}

export function resolveShareLinkStatus(
  doc: Doc<"auditShareLinks">,
  now = Date.now(),
): AuditShareLinkStatus {
  if (doc.status === "revoked") return "revoked";
  if (doc.status === "expired" || doc.expiresAt <= now) return "expired";
  return "active";
}

export function maskShareToken(last4: string): string {
  return `${SHARE_TOKEN_PREFIX}••••${last4}`;
}

export function docToAuditShareLinkRecord(
  doc: Doc<"auditShareLinks">,
  workspaceExternalId: string,
  now = Date.now(),
): AuditShareLinkRecord {
  return {
    id: doc._id,
    workspaceId: workspaceExternalId,
    reportId: doc.reportId,
    maskedToken: maskShareToken(doc.last4),
    status: resolveShareLinkStatus(doc, now),
    expiresAt: doc.expiresAt,
    lastAccessedAt: doc.lastAccessedAt,
    accessCount: doc.accessCount ?? 0,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    revokedAt: doc.revokedAt,
  };
}

export async function markShareLinkExpired(
  ctx: DbWriteCtx,
  shareLinkId: Id<"auditShareLinks">,
): Promise<void> {
  const now = Date.now();
  await ctx.db.patch(shareLinkId, {
    status: "expired",
    updatedAt: now,
  });
}

export function isShareTokenFormat(token: string): boolean {
  return token.startsWith(SHARE_TOKEN_PREFIX) && token.length > SHARE_TOKEN_PREFIX.length + 8;
}
