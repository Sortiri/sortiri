import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { insertEvent } from "./eventsLib";

type DbWriteCtx = Pick<MutationCtx, "db">;

export type IntegrationSystemEventType =
  | "integration.secret_saved"
  | "integration.secret_revoked"
  | "integration.migrated_to_encrypted_secret"
  | "integration.webhook_error"
  | "integration.connection_restored";

export async function recordIntegrationSystemEvent(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    type: IntegrationSystemEventType;
    title: string;
    summary?: string;
    importance?: "normal" | "high";
  },
): Promise<Id<"events">> {
  return insertEvent(ctx, {
    workspaceId: input.workspaceId,
    source: "system",
    category: "system_event",
    type: input.type,
    actor: { type: "system", name: "Sortiri Integrations" },
    title: input.title,
    summary: input.summary,
    visibility: "primary",
    importance: input.importance ?? "normal",
  });
}
