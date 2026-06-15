import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  getConnectionByWorkspaceSource,
  recordIntegrationConnectionEvent,
  type IntegrationCreatedBy,
  type IntegrationSource,
  upsertIntegrationConnection,
} from "./integrationConnectionsLib";
import {
  createIntegrationSecretDoc,
  getActiveIntegrationSecret,
  revokeActiveIntegrationSecrets,
  revokeIntegrationSecretDoc,
} from "./integrationSecretsLib";
import { encryptSecret, maskSecretForSource } from "./secretsLib";
import { recordIntegrationSystemEvent } from "./integrationEventsLib";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type IntegrationConnectionMetadata = {
  lastError?: string;
  lastErrorAt?: number;
  legacySecretPathUsed?: boolean;
};

export async function ensureIntegrationConnection(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    source: IntegrationSource;
    name: string;
    status?: Doc<"integrationConnections">["status"];
    createdBy?: IntegrationCreatedBy;
  },
): Promise<Id<"integrationConnections">> {
  return upsertIntegrationConnection(ctx, {
    workspaceId: input.workspaceId,
    source: input.source,
    name: input.name,
    status: input.status ?? "connected",
    createdBy: input.createdBy,
  });
}

export async function getIntegrationConnection(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  source: IntegrationSource,
) {
  return getConnectionByWorkspaceSource(ctx, workspaceId, source);
}

export async function updateIntegrationStatus(
  ctx: DbWriteCtx,
  workspaceId: Id<"workspaces">,
  source: IntegrationSource,
  occurredAt: number,
): Promise<void> {
  await recordIntegrationConnectionEvent(ctx, workspaceId, source, occurredAt);
  await clearIntegrationConnectionError(ctx, workspaceId, source);
}

export async function setIntegrationConnectionError(
  ctx: DbWriteCtx,
  workspaceId: Id<"workspaces">,
  source: IntegrationSource,
  connectionName: string,
  error: string,
): Promise<void> {
  const now = Date.now();
  let connection = await getConnectionByWorkspaceSource(ctx, workspaceId, source);
  if (!connection) {
    const connectionId = await upsertIntegrationConnection(ctx, {
      workspaceId,
      source,
      name: connectionName,
      status: "error",
    });
    connection = (await ctx.db.get(connectionId))!;
  }

  const metadata: IntegrationConnectionMetadata = {
    ...((connection.metadata as IntegrationConnectionMetadata | undefined) ?? {}),
    lastError: error,
    lastErrorAt: now,
  };

  await ctx.db.patch(connection._id, {
    status: "error",
    metadata,
    updatedAt: now,
  });
}

export async function clearIntegrationConnectionError(
  ctx: DbWriteCtx,
  workspaceId: Id<"workspaces">,
  source: IntegrationSource,
): Promise<void> {
  const connection = await getConnectionByWorkspaceSource(ctx, workspaceId, source);
  if (!connection) return;

  const metadata = { ...((connection.metadata as IntegrationConnectionMetadata | undefined) ?? {}) };
  delete metadata.lastError;
  delete metadata.lastErrorAt;

  await ctx.db.patch(connection._id, {
    status: connection.status === "error" ? "connected" : connection.status,
    metadata,
    updatedAt: Date.now(),
  });
}

export async function markLegacySecretPathUsed(
  ctx: DbWriteCtx,
  workspaceId: Id<"workspaces">,
  source: IntegrationSource,
  connectionName: string,
): Promise<void> {
  let connection = await getConnectionByWorkspaceSource(ctx, workspaceId, source);
  if (!connection) {
    const connectionId = await ensureIntegrationConnection(ctx, {
      workspaceId,
      source,
      name: connectionName,
      status: "connected",
    });
    connection = (await ctx.db.get(connectionId))!;
  }

  const metadata: IntegrationConnectionMetadata = {
    ...((connection.metadata as IntegrationConnectionMetadata | undefined) ?? {}),
    legacySecretPathUsed: true,
  };

  await ctx.db.patch(connection._id, {
    metadata,
    updatedAt: Date.now(),
  });
}

export async function saveEncryptedIntegrationSecret(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    source: IntegrationSource;
    connectionName: string;
    secretName: string;
    rawSecret: string;
    createdBy?: IntegrationCreatedBy;
  },
): Promise<{ last4: string; connectionId: Id<"integrationConnections"> }> {
  const last4 = input.rawSecret.slice(-4);
  const encryptedSecret = await encryptSecret(input.rawSecret);

  await revokeActiveIntegrationSecrets(ctx, input.workspaceId, input.source);

  const connectionId = await ensureIntegrationConnection(ctx, {
    workspaceId: input.workspaceId,
    source: input.source,
    name: input.connectionName,
    status: "connected",
    createdBy: input.createdBy,
  });

  await createIntegrationSecretDoc(ctx, {
    workspaceId: input.workspaceId,
    connectionId,
    source: input.source,
    name: input.secretName,
    encryptedSecret,
    secretLast4: last4,
    createdBy: input.createdBy,
  });

  await clearIntegrationConnectionError(ctx, input.workspaceId, input.source);

  await recordIntegrationSystemEvent(ctx, {
    workspaceId: input.workspaceId,
    type: "integration.secret_saved",
    title: `${input.connectionName} webhook secret saved`,
    summary: `Encrypted webhook secret saved for ${input.source}.`,
  });

  return { last4, connectionId };
}

export async function getActiveIntegrationSecretMetadata(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  source: IntegrationSource,
) {
  const secretDoc = await getActiveIntegrationSecret(ctx, workspaceId, source);
  if (!secretDoc) return null;

  return {
    id: secretDoc._id,
    secretLast4: secretDoc.secretLast4,
    status: secretDoc.status,
    maskedSecret: maskSecretForSource(secretDoc.secretLast4, source),
    connectionId: secretDoc.connectionId,
  };
}

export async function getActiveIntegrationSecretForServer(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  source: IntegrationSource,
) {
  const secretDoc = await getActiveIntegrationSecret(ctx, workspaceId, source);
  if (!secretDoc) return null;

  return {
    encryptedSecret: secretDoc.encryptedSecret,
    secretLast4: secretDoc.secretLast4,
  };
}

export async function revokeIntegrationSecret(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    source: IntegrationSource;
    connectionName: string;
    secretId?: Id<"integrationSecrets">;
  },
): Promise<void> {
  if (input.secretId) {
    await revokeIntegrationSecretDoc(ctx, input.secretId);
  } else {
    await revokeActiveIntegrationSecrets(ctx, input.workspaceId, input.source);
  }

  const connection = await getConnectionByWorkspaceSource(ctx, input.workspaceId, input.source);
  if (connection) {
    await ctx.db.patch(connection._id, {
      status: "revoked",
      updatedAt: Date.now(),
    });
  } else {
    await upsertIntegrationConnection(ctx, {
      workspaceId: input.workspaceId,
      source: input.source,
      name: input.connectionName,
      status: "revoked",
    });
  }

  await recordIntegrationSystemEvent(ctx, {
    workspaceId: input.workspaceId,
    type: "integration.secret_revoked",
    title: `${input.connectionName} webhook secret revoked`,
    summary: `Webhook secret revoked for ${input.source}.`,
  });
}

export {
  getActiveIntegrationSecret,
  revokeActiveIntegrationSecrets,
  revokeIntegrationSecretDoc,
} from "./integrationSecretsLib";
export {
  getConnectionByWorkspaceSource,
  recordIntegrationConnectionEvent,
  setIntegrationConnectionStatus,
  upsertIntegrationConnection,
} from "./integrationConnectionsLib";
export {
  findDeliveryBySourceId,
  isDuplicateDelivery,
  markDeliveryFailed,
  markDeliveryProcessed,
  recordIntegrationDelivery,
} from "./integrationDeliveriesLib";
export { recordIntegrationSystemEvent } from "./integrationEventsLib";
