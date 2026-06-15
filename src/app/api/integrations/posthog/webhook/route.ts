import { api } from "../../../../../../convex/_generated/api";
import { getIngestConvexClient } from "@/lib/sortiri/ingestApi";
import { mapPostHogWebhook } from "@/lib/integrations/posthog/mapPostHogWebhook";
import { normalizePostHogPayload } from "@/lib/integrations/posthog/normalizePayload";
import { verifyBearerAuth } from "@/lib/integrations/posthog/verifyAuth";
import { decryptSecret } from "@/lib/security/secrets";

function getIntegrationServerKey(): string {
  const key = process.env.SORTIRI_INTEGRATION_SERVER_KEY;
  if (!key) {
    throw new Error("Missing SORTIRI_INTEGRATION_SERVER_KEY");
  }
  return key;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status });
}

async function recordWebhookError(
  convex: ReturnType<typeof getIngestConvexClient>,
  serverKey: string,
  workspaceExternalId: string,
  error: string,
  importance?: "high" | "normal",
) {
  try {
    await convex.mutation(api.integrations.posthog.recordPosthogWebhookError, {
      serverKey,
      workspaceExternalId,
      error,
      importance,
    });
  } catch {
    // best effort
  }
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const workspaceExternalId = url.searchParams.get("workspaceId");
  if (!workspaceExternalId) {
    return jsonResponse({ error: "workspaceId is required" }, 400);
  }

  const authHeader = req.headers.get("authorization");
  const rawBody = await req.text();

  let serverKey: string;
  try {
    serverKey = getIntegrationServerKey();
  } catch {
    return jsonResponse({ error: "Integration server key is not configured" }, 500);
  }

  const convex = getIngestConvexClient();
  const secretResult = await convex.query(
    api.integrations.posthog.getWebhookSecretForVerification,
    {
      workspaceExternalId,
      serverKey,
    },
  );

  if (!secretResult?.encryptedSecret) {
    await recordWebhookError(
      convex,
      serverKey,
      workspaceExternalId,
      "No active PostHog webhook secret",
      "high",
    );
    return jsonResponse({ error: "No active PostHog webhook secret" }, 401);
  }

  let webhookSecret: string;
  try {
    webhookSecret = decryptSecret(secretResult.encryptedSecret);
  } catch {
    return jsonResponse({ error: "Webhook secret decryption failed" }, 500);
  }

  if (!verifyBearerAuth(authHeader, webhookSecret)) {
    await recordWebhookError(
      convex,
      serverKey,
      workspaceExternalId,
      "Invalid PostHog webhook authorization",
      "high",
    );
    return jsonResponse({ error: "Invalid authorization" }, 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    await recordWebhookError(
      convex,
      serverKey,
      workspaceExternalId,
      "Invalid PostHog JSON payload",
    );
    return jsonResponse({ error: "Invalid JSON payload" }, 400);
  }

  let normalizedEvents;
  try {
    normalizedEvents = normalizePostHogPayload(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid PostHog payload shape";
    await recordWebhookError(convex, serverKey, workspaceExternalId, message);
    return jsonResponse({ error: message }, 400);
  }

  let duplicate = false;
  try {
    for (const normalized of normalizedEvents) {
      const mapped = mapPostHogWebhook(normalized);
      const result = await convex.mutation(api.integrations.posthog.recordPostHogDelivery, {
        serverKey,
        workspaceExternalId,
        deliveryId: mapped.deliveryId,
        posthogEventName: mapped.posthogEventName,
        source: mapped.source,
        category: mapped.category,
        type: mapped.type,
        actor: mapped.actor,
        title: mapped.title,
        summary: mapped.summary,
        entity: mapped.entity,
        data: mapped.data,
        occurredAt: mapped.occurredAt,
        importance: mapped.importance,
        visibility: mapped.visibility,
      });
      if (result.duplicate === true) {
        duplicate = true;
      }
    }

    return jsonResponse({
      received: true,
      duplicate: duplicate || undefined,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Failed to record PostHog event",
      },
      500,
    );
  }
}
