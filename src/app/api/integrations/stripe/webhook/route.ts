import { api } from "../../../../../../convex/_generated/api";
import { getIngestConvexClient } from "@/lib/sortiri/ingestApi";
import { mapStripeWebhook } from "@/lib/integrations/stripe/mapStripeWebhook";
import { verifyStripeSignature } from "@/lib/integrations/stripe/verifySignature";
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

export async function POST(req: Request) {
  const url = new URL(req.url);
  const workspaceExternalId = url.searchParams.get("workspaceId");
  if (!workspaceExternalId) {
    return jsonResponse({ error: "workspaceId is required" }, 400);
  }

  const signatureHeader = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let serverKey: string;
  try {
    serverKey = getIntegrationServerKey();
  } catch {
    return jsonResponse({ error: "Integration server key is not configured" }, 500);
  }

  const convex = getIngestConvexClient();
  const secretResult = await convex.query(
    api.integrations.stripe.getWebhookSecretForVerification,
    {
      workspaceExternalId,
      serverKey,
    },
  );

  if (!secretResult?.encryptedSecret) {
    return jsonResponse({ error: "No active Stripe webhook secret" }, 401);
  }

  let webhookSecret: string;
  try {
    webhookSecret = decryptSecret(secretResult.encryptedSecret);
  } catch {
    return jsonResponse({ error: "Webhook secret decryption failed" }, 500);
  }

  if (!verifyStripeSignature(rawBody, signatureHeader, webhookSecret)) {
    return jsonResponse({ error: "Invalid signature" }, 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return jsonResponse({ error: "Invalid JSON payload" }, 400);
  }

  const stripeEvent = payload as { id?: string; type?: string };
  const eventType = stripeEvent.type;
  if (!eventType) {
    return jsonResponse({ error: "Missing Stripe event type" }, 400);
  }

  const mapped = mapStripeWebhook(eventType, payload);
  if (!mapped) {
    return jsonResponse({ received: true, skipped: true });
  }

  try {
    const result = await convex.mutation(api.integrations.stripe.recordStripeDelivery, {
      serverKey,
      workspaceExternalId,
      deliveryId: stripeEvent.id,
      stripeEventType: eventType,
      source: mapped.source,
      category: mapped.category,
      type: mapped.type,
      actor: mapped.actor,
      title: mapped.title,
      summary: mapped.summary,
      entity: mapped.entity,
      data: mapped.data,
      occurredAt: mapped.occurredAt,
      severity: mapped.severity,
      importance: mapped.importance,
      visibility: mapped.visibility,
    });

    return jsonResponse({
      received: true,
      duplicate: result.duplicate === true,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Failed to record Stripe event",
      },
      500,
    );
  }
}
