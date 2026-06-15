import { verifyGithubSignature } from "@/lib/integrations/github/verifySignature";
import { mapWebhookPayload } from "@/lib/integrations/github/mapWebhook";
import { decryptSecret } from "@/lib/security/secrets";
import { api } from "../../../../../../convex/_generated/api";
import { getIngestConvexClient } from "@/lib/sortiri/ingestApi";

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

export async function POST(req: Request) {
  const url = new URL(req.url);
  const workspaceExternalId = url.searchParams.get("workspaceId");
  if (!workspaceExternalId) {
    return jsonResponse({ error: "workspaceId is required" }, 400);
  }

  const githubEventType = req.headers.get("x-github-event");
  const deliveryId = req.headers.get("x-github-delivery");
  const signatureHeader = req.headers.get("x-hub-signature-256");
  const rawBody = await req.text();

  if (githubEventType === "ping") {
    return jsonResponse({ ok: true, ping: true });
  }

  let serverKey: string;
  try {
    serverKey = getIntegrationServerKey();
  } catch {
    return jsonResponse({ error: "Integration server key is not configured" }, 500);
  }

  const convex = getIngestConvexClient();
  const secretResult = await convex.query(api.integrations.github.getActiveSecretForServer, {
    workspaceExternalId,
    serverKey,
  });

  if (!secretResult) {
    await convex.mutation(api.integrations.github.recordGithubWebhookError, {
      serverKey,
      workspaceExternalId,
      error: "No active GitHub webhook secret",
    });
    return jsonResponse({ error: "No active GitHub webhook secret" }, 401);
  }

  let webhookSecret: string;
  let usedLegacySecret = false;
  try {
    if (secretResult.encryptedSecret) {
      webhookSecret = decryptSecret(secretResult.encryptedSecret);
    } else if (secretResult.legacyPlaintext) {
      webhookSecret = secretResult.legacyPlaintext;
      usedLegacySecret = true;
      console.warn(
        `[github-webhook] Legacy githubWebhookSecrets path used for workspace ${workspaceExternalId}`,
      );
    } else {
      await convex.mutation(api.integrations.github.recordGithubWebhookError, {
        serverKey,
        workspaceExternalId,
        error: "No active GitHub webhook secret",
      });
      return jsonResponse({ error: "No active GitHub webhook secret" }, 401);
    }
  } catch {
    await convex.mutation(api.integrations.github.recordGithubWebhookError, {
      serverKey,
      workspaceExternalId,
      error: "Webhook secret decryption failed",
    });
    return jsonResponse({ error: "Webhook secret decryption failed" }, 500);
  }

  if (!verifyGithubSignature(rawBody, signatureHeader, webhookSecret)) {
    await convex.mutation(api.integrations.github.recordGithubWebhookError, {
      serverKey,
      workspaceExternalId,
      error: "Invalid signature",
      usedLegacySecret: usedLegacySecret || undefined,
    });
    return jsonResponse({ error: "Invalid signature" }, 401);
  }

  if (usedLegacySecret) {
    await convex
      .mutation(api.integrations.github.markGithubLegacySecretPath, {
        serverKey,
        workspaceExternalId,
      })
      .catch(() => undefined);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    await convex.mutation(api.integrations.github.recordGithubWebhookError, {
      serverKey,
      workspaceExternalId,
      error: "Invalid JSON payload",
    });
    return jsonResponse({ error: "Invalid JSON payload" }, 400);
  }

  if (!githubEventType) {
    return jsonResponse({ error: "Missing x-github-event header" }, 400);
  }

  const mapped = mapWebhookPayload(githubEventType, payload);
  if (!mapped) {
    return jsonResponse({ ok: true, skipped: true });
  }

  try {
    const result = await convex.mutation(api.integrations.github.recordGithubEvent, {
      serverKey,
      workspaceExternalId,
      deliveryId: deliveryId ?? undefined,
      githubEventType,
      source: mapped.source,
      category: mapped.category,
      type: mapped.type,
      actor: mapped.actor,
      title: mapped.title,
      summary: mapped.summary,
      entity: mapped.entity,
      data: mapped.data,
      occurredAt: mapped.occurredAt,
    });

    return jsonResponse({
      ok: true,
      duplicate: result.duplicate ?? false,
      eventId: "eventId" in result ? result.eventId : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record GitHub event";
    await convex.mutation(api.integrations.github.recordGithubWebhookError, {
      serverKey,
      workspaceExternalId,
      error: message,
      importance: "high",
    });
    return jsonResponse({ error: message }, 500);
  }
}
