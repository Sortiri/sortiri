import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { api } from "../_generated/api";
import {
  authenticateIntegrationRequest,
  getIntegrationServerKey,
} from "../lib/httpAuth";
import { getQueryParam, readRawBody } from "../lib/httpRequest";
import { jsonError, jsonOk, jsonResponse } from "../lib/httpResponse";
import { mapWebhookPayload } from "../lib/integrations/githubMapWebhook";
import { mapStripeWebhook } from "../lib/integrations/stripeMapWebhook";
import { mapPostHogWebhook } from "../lib/integrations/posthogMapWebhook";
import { normalizePostHogPayload } from "../lib/integrations/posthogNormalizePayload";
import {
  verifyGithubSignature,
  verifyStripeSignature,
  verifyPostHogBearer,
  verifySlackSignature,
  verifyObservabilitySignature,
} from "../lib/integrations/webhookVerify";
import { isUrlVerification, mapSlackWebhook } from "../lib/integrations/slackMapWebhook";
import { mapObservabilityWebhook } from "../lib/integrations/observabilityMapWebhook";
import { decryptSecret } from "../lib/secretsLib";

async function runWebhookIngest(
  ctx: ActionCtx,
  input: {
    serverKey: string;
    workspaceExternalId: string;
    source: string;
    sourceEventId: string;
    payload: Record<string, unknown>;
    route: string;
    integrationSource: string;
    integrationDeliveryId: string;
    integrationEventType?: string;
  },
) {
  return ctx.runMutation(internal.ingestPipelineHttp.runIngest, {
    serverKey: input.serverKey,
    workspaceExternalId: input.workspaceExternalId,
    body: input.payload,
    route: input.route,
    integrationSource: input.integrationSource,
    integrationDeliveryId: input.integrationDeliveryId,
    integrationEventType: input.integrationEventType,
  });
}

export async function handleGithubWebhook(
  ctx: ActionCtx,
  request: Request,
): Promise<Response> {
  const workspaceExternalId = getQueryParam(request, "workspaceId");
  const authResult = authenticateIntegrationRequest(request, workspaceExternalId);
  if (!authResult.ok) return authResult.response;

  const githubEventType = request.headers.get("x-github-event");
  const deliveryId = request.headers.get("x-github-delivery");
  const signatureHeader = request.headers.get("x-hub-signature-256");
  const rawBody = await readRawBody(request);

  if (githubEventType === "ping") {
    return jsonOk({ ping: true });
  }

  const { serverKey, workspaceExternalId: wsId } = authResult.auth as Extract<
    typeof authResult.auth,
    { mode: "integration" }
  >;

  const secretResult = await ctx.runQuery(
    api.integrations.github.getActiveSecretForServer,
    { workspaceExternalId: wsId, serverKey },
  );

  if (!secretResult) {
    await ctx.runMutation(api.integrations.github.recordGithubWebhookError, {
      serverKey,
      workspaceExternalId: wsId,
      error: "No active GitHub webhook secret",
    });
    return jsonError("No active GitHub webhook secret", 401);
  }

  let webhookSecret: string;
  let usedLegacySecret = false;
  try {
    if (secretResult.encryptedSecret) {
      webhookSecret = await decryptSecret(secretResult.encryptedSecret);
    } else if (secretResult.legacyPlaintext) {
      webhookSecret = secretResult.legacyPlaintext;
      usedLegacySecret = true;
    } else {
      return jsonError("No active GitHub webhook secret", 401);
    }
  } catch {
    return jsonError("Webhook secret decryption failed", 500);
  }

  if (!(await verifyGithubSignature(rawBody, signatureHeader, webhookSecret))) {
    await ctx.runMutation(api.integrations.github.recordGithubWebhookError, {
      serverKey,
      workspaceExternalId: wsId,
      error: "Invalid signature",
      usedLegacySecret: usedLegacySecret || undefined,
    });
    return jsonError("Invalid signature", 401);
  }

  if (usedLegacySecret) {
    await ctx
      .runMutation(api.integrations.github.markGithubLegacySecretPath, {
        serverKey,
        workspaceExternalId: wsId,
      })
      .catch(() => undefined);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return jsonError("Invalid JSON payload", 400);
  }

  if (!githubEventType) {
    return jsonError("Missing x-github-event header", 400);
  }

  const mapped = mapWebhookPayload(githubEventType, payload);
  if (!mapped) {
    return jsonOk({ skipped: true });
  }

  try {
    const sourceEventId = deliveryId ?? `github:${crypto.randomUUID()}`;
    const result = await runWebhookIngest(ctx, {
      serverKey,
      workspaceExternalId: wsId,
      source: mapped.source,
      sourceEventId,
      route: "/webhooks/github",
      integrationSource: "github",
      integrationDeliveryId: sourceEventId,
      integrationEventType: githubEventType,
      payload: {
        source: mapped.source,
        category: mapped.category,
        type: mapped.type,
        actor: mapped.actor,
        title: mapped.title,
        summary: mapped.summary,
        entity: mapped.entity,
        data: mapped.data,
        occurredAt: mapped.occurredAt,
        sourceEventId,
      },
    });
    return jsonOk({
      duplicate: result.duplicate,
      eventId: result.eventId,
      deliveryId: result.deliveryId,
      status: result.status,
      journalRef: result.journalRef,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record GitHub event";
    await ctx.runMutation(api.integrations.github.recordGithubWebhookError, {
      serverKey,
      workspaceExternalId: wsId,
      error: message,
      importance: "high",
    });
    return jsonError(message, 500);
  }
}

export async function handleStripeWebhook(
  ctx: ActionCtx,
  request: Request,
): Promise<Response> {
  const workspaceExternalId = getQueryParam(request, "workspaceId");
  const authResult = authenticateIntegrationRequest(request, workspaceExternalId);
  if (!authResult.ok) return authResult.response;

  const signatureHeader = request.headers.get("stripe-signature");
  const rawBody = await readRawBody(request);
  const { serverKey, workspaceExternalId: wsId } = authResult.auth as Extract<
    typeof authResult.auth,
    { mode: "integration" }
  >;

  const secretResult = await ctx.runQuery(
    api.integrations.stripe.getWebhookSecretForVerification,
    { workspaceExternalId: wsId, serverKey },
  );

  if (!secretResult?.encryptedSecret) {
    return jsonError("No active Stripe webhook secret", 401);
  }

  let webhookSecret: string;
  try {
    webhookSecret = await decryptSecret(secretResult.encryptedSecret);
  } catch {
    return jsonError("Webhook secret decryption failed", 500);
  }

  if (!(await verifyStripeSignature(rawBody, signatureHeader, webhookSecret))) {
    return jsonError("Invalid signature", 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return jsonError("Invalid JSON payload", 400);
  }

  const stripeEvent = payload as { id?: string; type?: string };
  const eventType = stripeEvent.type;
  if (!eventType) {
    return jsonError("Missing Stripe event type", 400);
  }

  const mapped = mapStripeWebhook(eventType, payload);
  if (!mapped) {
    return jsonResponse({ received: true, skipped: true });
  }

  try {
    const sourceEventId = stripeEvent.id ?? `stripe:${eventType}`;
    const result = await runWebhookIngest(ctx, {
      serverKey,
      workspaceExternalId: wsId,
      source: mapped.source,
      sourceEventId,
      route: "/webhooks/stripe",
      integrationSource: "stripe",
      integrationDeliveryId: sourceEventId,
      integrationEventType: eventType,
      payload: {
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
        sourceEventId,
      },
    });
    return jsonOk({
      duplicate: result.duplicate,
      eventId: result.eventId,
      deliveryId: result.deliveryId,
      status: result.status,
      journalRef: result.journalRef,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record Stripe event";
    return jsonError(message, 500);
  }
}

export async function handlePosthogWebhook(
  ctx: ActionCtx,
  request: Request,
): Promise<Response> {
  const workspaceExternalId = getQueryParam(request, "workspaceId");
  const authResult = authenticateIntegrationRequest(request, workspaceExternalId);
  if (!authResult.ok) return authResult.response;

  const authHeader = request.headers.get("authorization");
  const rawBody = await readRawBody(request);
  const { serverKey, workspaceExternalId: wsId } = authResult.auth as Extract<
    typeof authResult.auth,
    { mode: "integration" }
  >;

  const secretResult = await ctx.runQuery(
    api.integrations.posthog.getWebhookSecretForVerification,
    { workspaceExternalId: wsId, serverKey },
  );

  if (!secretResult?.encryptedSecret) {
    await ctx.runMutation(api.integrations.posthog.recordPosthogWebhookError, {
      serverKey,
      workspaceExternalId: wsId,
      error: "No active PostHog webhook secret",
      importance: "high",
    });
    return jsonError("No active PostHog webhook secret", 401);
  }

  let webhookSecret: string;
  try {
    webhookSecret = await decryptSecret(secretResult.encryptedSecret);
  } catch {
    return jsonError("Webhook secret decryption failed", 500);
  }

  if (!verifyPostHogBearer(authHeader, webhookSecret)) {
    await ctx.runMutation(api.integrations.posthog.recordPosthogWebhookError, {
      serverKey,
      workspaceExternalId: wsId,
      error: "Invalid PostHog webhook authorization",
      importance: "high",
    });
    return jsonError("Invalid authorization", 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return jsonError("Invalid PostHog JSON payload", 400);
  }

  let normalizedEvents;
  try {
    normalizedEvents = normalizePostHogPayload(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid PostHog payload shape";
    await ctx.runMutation(api.integrations.posthog.recordPosthogWebhookError, {
      serverKey,
      workspaceExternalId: wsId,
      error: message,
    });
    return jsonError(message, 400);
  }

  let duplicate = false;
  let lastResult: Awaited<ReturnType<typeof runWebhookIngest>> | null = null;

  try {
    for (const normalized of normalizedEvents) {
      const mapped = mapPostHogWebhook(normalized);
      if (!mapped) continue;
      const sourceEventId = normalized.deliveryId;
      lastResult = await runWebhookIngest(ctx, {
        serverKey,
        workspaceExternalId: wsId,
        source: mapped.source,
        sourceEventId,
        route: "/webhooks/posthog",
        integrationSource: "posthog",
        integrationDeliveryId: sourceEventId,
        integrationEventType: normalized.event,
        payload: {
          source: mapped.source,
          category: mapped.category,
          type: mapped.type,
          actor: mapped.actor,
          title: mapped.title,
          summary: mapped.summary,
          entity: mapped.entity,
          data: mapped.data,
          occurredAt: mapped.occurredAt,
          sourceEventId,
        },
      });
      duplicate = duplicate || lastResult.duplicate;
    }
    return jsonOk({
      duplicate,
      eventId: lastResult?.eventId,
      deliveryId: lastResult?.deliveryId,
      status: lastResult?.status,
      journalRef: lastResult?.journalRef,
      processed: normalizedEvents.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record PostHog event";
    await ctx.runMutation(api.integrations.posthog.recordPosthogWebhookError, {
      serverKey,
      workspaceExternalId: wsId,
      error: message,
      importance: "high",
    });
    return jsonError(message, 500);
  }
}

export async function handleSlackWebhook(
  ctx: ActionCtx,
  request: Request,
): Promise<Response> {
  const rawBody = await readRawBody(request);

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return jsonError("Invalid JSON payload", 400);
  }

  const slackPayload = payload as Parameters<typeof isUrlVerification>[0];
  if (isUrlVerification(slackPayload)) {
    return jsonResponse({ challenge: slackPayload.challenge });
  }

  const workspaceExternalId = getQueryParam(request, "workspaceId");
  const authResult = authenticateIntegrationRequest(request, workspaceExternalId);
  if (!authResult.ok) return authResult.response;

  const timestampHeader = request.headers.get("x-slack-request-timestamp");
  const signatureHeader = request.headers.get("x-slack-signature");
  const { serverKey, workspaceExternalId: wsId } = authResult.auth as Extract<
    typeof authResult.auth,
    { mode: "integration" }
  >;

  const secretResult = await ctx.runQuery(
    api.integrations.slack.getWebhookSecretForVerification,
    { workspaceExternalId: wsId, serverKey },
  );

  if (!secretResult?.encryptedSecret) {
    await ctx.runMutation(api.integrations.slack.recordSlackWebhookError, {
      serverKey,
      workspaceExternalId: wsId,
      error: "No active Slack signing secret",
      importance: "high",
    });
    return jsonError("No active Slack signing secret", 401);
  }

  let signingSecret: string;
  try {
    signingSecret = await decryptSecret(secretResult.encryptedSecret);
  } catch {
    return jsonError("Signing secret decryption failed", 500);
  }

  if (!(await verifySlackSignature(rawBody, timestampHeader, signatureHeader, signingSecret))) {
    await ctx.runMutation(api.integrations.slack.recordSlackWebhookError, {
      serverKey,
      workspaceExternalId: wsId,
      error: "Invalid Slack signature",
      importance: "high",
    });
    return jsonError("Invalid signature", 401);
  }

  const mapped = mapSlackWebhook(slackPayload as never, secretResult.config);
  if (mapped === "blocked") {
    return jsonOk({ skipped: true, blocked: true });
  }
  if (!mapped) {
    return jsonOk({ skipped: true });
  }

  try {
    const result = await runWebhookIngest(ctx, {
      serverKey,
      workspaceExternalId: wsId,
      source: mapped.source,
      sourceEventId: mapped.sourceEventId,
      route: "/webhooks/slack",
      integrationSource: "slack",
      integrationDeliveryId: mapped.sourceEventId,
      integrationEventType: (slackPayload as { event?: { type?: string } }).event?.type,
      payload: {
        source: mapped.source,
        category: mapped.category,
        type: mapped.type,
        actor: mapped.actor,
        title: mapped.title,
        summary: mapped.summary,
        data: mapped.data,
        occurredAt: mapped.occurredAt,
        visibility: mapped.isDecisionCandidate || mapped.isRollback ? "primary" : "debug",
        importance: mapped.isDecisionCandidate || mapped.isRollback ? "high" : "normal",
        sourceEventId: mapped.sourceEventId,
      },
    });

    if ((mapped.isDecisionCandidate || mapped.isRollback) && mapped.text) {
      await ctx.runMutation(internal.integrations.slack.processSlackDecisionSideEffects, {
        workspaceExternalId: wsId,
        text: mapped.text,
        channelId: mapped.channelId,
        messageTs: mapped.data?.messageTs as string | undefined,
        threadTs: mapped.data?.threadTs as string | undefined,
        sourceEventId: mapped.sourceEventId,
        isDecisionCandidate: mapped.isDecisionCandidate,
        isRollback: mapped.isRollback,
      });
    }

    return jsonOk({
      duplicate: result.duplicate,
      eventId: result.eventId,
      deliveryId: result.deliveryId,
      status: result.status,
      journalRef: result.journalRef,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record Slack event";
    await ctx.runMutation(api.integrations.slack.recordSlackWebhookError, {
      serverKey,
      workspaceExternalId: wsId,
      error: message,
      importance: "high",
    });
    return jsonError(message, 500);
  }
}

export async function handleObservabilityWebhook(
  ctx: ActionCtx,
  request: Request,
): Promise<Response> {
  const rawBody = await readRawBody(request);

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return jsonError("Invalid JSON payload", 400);
  }

  const workspaceExternalId = getQueryParam(request, "workspaceId");
  const authResult = authenticateIntegrationRequest(request, workspaceExternalId);
  if (!authResult.ok) return authResult.response;

  const timestampHeader =
    request.headers.get("x-sortiri-request-timestamp") ??
    request.headers.get("x-slack-request-timestamp");
  const signatureHeader =
    request.headers.get("x-sortiri-signature") ??
    request.headers.get("x-slack-signature");
  const { serverKey, workspaceExternalId: wsId } = authResult.auth as Extract<
    typeof authResult.auth,
    { mode: "integration" }
  >;

  const secretResult = await ctx.runQuery(
    api.integrations.observability.getWebhookSecretForVerification,
    { workspaceExternalId: wsId, serverKey },
  );

  if (!secretResult?.encryptedSecret) {
    await ctx.runMutation(api.integrations.observability.recordObservabilityWebhookError, {
      serverKey,
      workspaceExternalId: wsId,
      error: "No active observability signing secret",
      importance: "high",
    });
    return jsonError("No active observability signing secret", 401);
  }

  let signingSecret: string;
  try {
    signingSecret = await decryptSecret(secretResult.encryptedSecret);
  } catch {
    return jsonError("Signing secret decryption failed", 500);
  }

  if (
    !(await verifyObservabilitySignature(
      rawBody,
      timestampHeader,
      signatureHeader,
      signingSecret,
    ))
  ) {
    await ctx.runMutation(api.integrations.observability.recordObservabilityWebhookError, {
      serverKey,
      workspaceExternalId: wsId,
      error: "Invalid observability signature",
      importance: "high",
    });
    return jsonError("Invalid signature", 401);
  }

  const mapped = mapObservabilityWebhook(payload, secretResult.config);
  if (mapped && "blocked" in mapped) {
    return jsonOk({ skipped: true, blocked: true });
  }
  if (!mapped) {
    return jsonError("Unsupported observability payload", 400);
  }

  try {
    const result = await runWebhookIngest(ctx, {
      serverKey,
      workspaceExternalId: wsId,
      source: mapped.source,
      sourceEventId: mapped.sourceEventId,
      route: "/webhooks/observability",
      integrationSource: "observability",
      integrationDeliveryId: mapped.sourceEventId,
      integrationEventType: mapped.type,
      payload: {
        source: mapped.source,
        category: mapped.category,
        type: mapped.type,
        actor: mapped.actor,
        title: mapped.title,
        summary: mapped.summary,
        data: mapped.data,
        occurredAt: mapped.occurredAt,
        visibility: mapped.visibility,
        importance: mapped.importance,
        sourceEventId: mapped.sourceEventId,
      },
    });

    await ctx.runMutation(internal.integrations.observability.processObservabilitySideEffects, {
      workspaceExternalId: wsId,
      normalized: mapped.normalized,
      timelineEventId: result.eventId,
      duplicate: result.duplicate,
    });

    return jsonOk({
      duplicate: result.duplicate,
      eventId: result.eventId,
      deliveryId: result.deliveryId,
      status: result.status,
      journalRef: result.journalRef,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to record observability event";
    await ctx.runMutation(api.integrations.observability.recordObservabilityWebhookError, {
      serverKey,
      workspaceExternalId: wsId,
      error: message,
      importance: "high",
    });
    return jsonError(message, 500);
  }
}
