import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  INVITE_TOKEN_PREFIX,
  INVITE_TTL_MS,
  type InviteRole,
} from "../../src/types/workspace-invites";
import type {
  WorkspaceMemberRecord,
  WorkspaceRole,
} from "../../src/types/workspace-members";
import type { CurrentUser } from "./authz";
import { insertEvent } from "./eventsLib";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashInviteToken(rawToken: string): Promise<string> {
  const data = new TextEncoder().encode(rawToken);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

export function generateRawInviteToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `${INVITE_TOKEN_PREFIX}${bytesToHex(bytes)}`;
}

export async function findInviteByHash(
  ctx: DbReadCtx,
  tokenHash: string,
): Promise<Doc<"workspaceInvites"> | null> {
  const invites = await ctx.db
    .query("workspaceInvites")
    .withIndex("by_token_prefix", (q) => q.eq("tokenPrefix", INVITE_TOKEN_PREFIX))
    .collect();
  return invites.find((row) => row.tokenHash === tokenHash) ?? null;
}

export function docToMemberRecord(
  doc: Doc<"workspaceMembers">,
  workspaceExternalId: string,
): WorkspaceMemberRecord {
  return {
    id: doc._id,
    workspaceId: workspaceExternalId,
    clerkUserId: doc.clerkUserId,
    email: doc.email,
    name: doc.name,
    imageUrl: doc.imageUrl,
    role: doc.role,
    status: doc.status,
    joinedAt: doc.joinedAt,
    invitedBy: doc.invitedBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function countOwners(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
): Promise<number> {
  const owners = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_role", (q) =>
      q.eq("workspaceId", workspaceId).eq("role", "owner"),
    )
    .collect();
  return owners.filter((row) => row.status === "active").length;
}

export async function assertNotLastOwner(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  memberId: Id<"workspaceMembers">,
): Promise<void> {
  const member = await ctx.db.get(memberId);
  if (!member || member.role !== "owner") {
    return;
  }
  const ownerCount = await countOwners(ctx, workspaceId);
  if (ownerCount <= 1) {
    throw new Error("Cannot remove or demote the last owner");
  }
}

export async function createMemberDoc(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    clerkUserId: string;
    email?: string;
    name?: string;
    imageUrl?: string;
    role: WorkspaceRole;
    invitedBy?: Doc<"workspaceMembers">["invitedBy"];
  },
): Promise<Id<"workspaceMembers">> {
  const now = Date.now();
  return ctx.db.insert("workspaceMembers", {
    workspaceId: input.workspaceId,
    clerkUserId: input.clerkUserId,
    email: input.email,
    name: input.name,
    imageUrl: input.imageUrl,
    role: input.role,
    status: "active",
    joinedAt: now,
    invitedBy: input.invitedBy,
    createdAt: now,
    updatedAt: now,
  });
}

export async function ensureOwnerForWorkspace(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  user: CurrentUser,
): Promise<void> {
  const existing = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  const active = existing.filter((row) => row.status === "active");
  if (active.length > 0) {
    return;
  }

  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) {
    return;
  }

  const now = Date.now();
  await ctx.db.insert("workspaceMembers", {
    workspaceId,
    clerkUserId: workspace.userId,
    email: user.clerkUserId === workspace.userId ? user.email : undefined,
    name: user.clerkUserId === workspace.userId ? user.name : undefined,
    imageUrl: user.clerkUserId === workspace.userId ? user.imageUrl : undefined,
    role: "owner",
    status: "active",
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

export async function listActiveMembersForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
): Promise<Doc<"workspaceMembers">[]> {
  const members = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  return members
    .filter((row) => row.status === "active")
    .sort((a, b) => (a.joinedAt ?? a.createdAt) - (b.joinedAt ?? b.createdAt));
}

export async function listMembershipsForUser(
  ctx: DbReadCtx,
  clerkUserId: string,
): Promise<Doc<"workspaceMembers">[]> {
  const members = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
    .collect();
  return members.filter((row) => row.status === "active");
}

export async function createInviteDoc(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    email: string;
    role: InviteRole;
    invitedBy?: Doc<"workspaceInvites">["invitedBy"];
  },
): Promise<{ inviteId: Id<"workspaceInvites">; rawToken: string; expiresAt: number }> {
  const rawToken = generateRawInviteToken();
  const tokenHash = await hashInviteToken(rawToken);
  const last4 = rawToken.slice(-4);
  const now = Date.now();
  const expiresAt = now + INVITE_TTL_MS;

  const inviteId = await ctx.db.insert("workspaceInvites", {
    workspaceId: input.workspaceId,
    email: input.email.trim().toLowerCase(),
    role: input.role,
    tokenHash,
    tokenPrefix: INVITE_TOKEN_PREFIX,
    last4,
    status: "pending",
    expiresAt,
    invitedBy: input.invitedBy,
    createdAt: now,
    updatedAt: now,
  });

  return { inviteId, rawToken, expiresAt };
}

export async function recordWorkspaceTeamEvent(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  type:
    | "workspace.member_invited"
    | "workspace.member_joined"
    | "workspace.member_removed"
    | "workspace.member_role_updated",
  actor: { name?: string; email?: string },
  summary: string,
): Promise<void> {
  await insertEvent(ctx, {
    workspaceId,
    source: "system",
    category: "system_event",
    type,
    visibility: "primary",
    importance: "normal",
    severity: "info",
    actor: {
      type: "human",
      name: actor.name ?? actor.email ?? "Team member",
    },
    title: summary,
    summary,
  });
}
