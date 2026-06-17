type EventActor = {
  type: "agent" | "human" | "system" | "customer";
  id?: string;
  name?: string;
  email?: string;
};

import type { PostHogNormalizedEvent } from "./posthogNormalizePayload";
import { selectPostHogSafeProperties } from "./posthogSafeProperties";

export type PostHogSortiriEventInput = {
  source: "posthog";
  category: "product_event";
  type: string;
  actor: EventActor;
  title: string;
  summary?: string;
  entity?: {
    type: "user" | "feature" | "customer" | "other";
    id?: string;
    name?: string;
  };
  data?: Record<string, unknown>;
  occurredAt?: number;
  importance?: "low" | "normal" | "high";
  visibility?: "primary" | "debug" | "hidden";
  deliveryId: string;
  posthogEventName: string;
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeEventName(event: string): string {
  return event
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function matchesAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((needle) => lower.includes(needle));
}

function resolveSortiriType(eventName: string): {
  type: string;
  importance: "normal" | "high";
  title: string;
} {
  const normalized = normalizeEventName(eventName);

  if (
    matchesAny(normalized, [
      "signed_up",
      "signup",
      "sign_up",
      "user_signed_up",
      "account_created",
    ])
  ) {
    return {
      type: "posthog.user.signed_up",
      importance: "high",
      title: "User signed up",
    };
  }

  if (
    matchesAny(normalized, [
      "activation",
      "onboarding_completed",
      "onboarding_complete",
      "activated",
      "activation_milestone",
    ])
  ) {
    return {
      type: "posthog.activation.completed",
      importance: "high",
      title: "Activation completed",
    };
  }

  if (
    matchesAny(normalized, [
      "checkout",
      "pricing",
      "trial",
      "invite",
      "subscription_viewed",
      "billing",
    ])
  ) {
    if (matchesAny(normalized, ["checkout", "pricing"])) {
      return {
        type: "posthog.checkout.clicked",
        importance: "high",
        title: "Checkout or pricing interaction",
      };
    }
    if (matchesAny(normalized, ["trial"])) {
      return {
        type: "posthog.trial.started",
        importance: "high",
        title: "Trial started",
      };
    }
    if (matchesAny(normalized, ["invite"])) {
      return {
        type: "posthog.invite.sent",
        importance: "normal",
        title: "Invite sent",
      };
    }
    return {
      type: `posthog.${normalized}`,
      importance: "normal",
      title: eventName,
    };
  }

  if (
    matchesAny(normalized, [
      "feature",
      "used",
      "clicked",
      "button",
      "pageview",
      "screen",
    ])
  ) {
    return {
      type: "posthog.feature.used",
      importance: "normal",
      title: "Feature used",
    };
  }

  return {
    type: `posthog.${normalized}`,
    importance: "normal",
    title: eventName,
  };
}

function parseOccurredAt(timestamp: string | number | undefined): number | undefined {
  if (typeof timestamp === "number" && Number.isFinite(timestamp)) {
    return timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000;
  }
  if (typeof timestamp === "string" && timestamp.trim()) {
    const parsed = Date.parse(timestamp);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function mergeProperties(event: PostHogNormalizedEvent): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    ...(event.properties ?? {}),
    ...(event.person?.properties ?? {}),
  };
  if (event.distinctId) merged.distinctId = event.distinctId;
  return merged;
}

function resolveActor(
  event: PostHogNormalizedEvent,
  properties: Record<string, unknown>,
): EventActor {
  const distinctId = event.distinctId ?? asString(properties.distinctId);
  const email =
    asString(properties.$email) ??
    asString(properties.email) ??
    (distinctId?.includes("@") ? distinctId : undefined);
  const name =
    asString(properties.$name) ??
    asString(properties.name) ??
    email ??
    distinctId ??
    "User";

  return {
    type: "human",
    id: distinctId,
    name,
    email,
  };
}

function resolveEntity(
  properties: Record<string, unknown>,
  actor: EventActor,
): PostHogSortiriEventInput["entity"] | undefined {
  const featureKey =
    asString(properties.feature) ??
    asString(properties.feature_key) ??
    asString(properties.feature_name) ??
    asString(properties.$pathname) ??
    asString(properties.path);

  if (featureKey) {
    return {
      type: "feature",
      id: featureKey,
      name: featureKey,
    };
  }

  const customerId =
    asString(properties.customer_id) ?? asString(properties.customerId);
  if (customerId) {
    return {
      type: "customer",
      id: customerId,
      name: actor.name ?? customerId,
    };
  }

  if (actor.id || actor.email) {
    return {
      type: "user",
      id: actor.id ?? actor.email,
      name: actor.name ?? actor.id ?? actor.email,
    };
  }

  return undefined;
}

export function mapPostHogWebhook(
  event: PostHogNormalizedEvent,
): PostHogSortiriEventInput {
  const rawProperties = mergeProperties(event);
  const safeProperties = selectPostHogSafeProperties(rawProperties);
  const mapping = resolveSortiriType(event.event);
  const actor = resolveActor(event, rawProperties);
  const entity = resolveEntity(rawProperties, actor);

  const summaryParts = [actor.name ?? actor.email ?? actor.id, event.event].filter(Boolean);
  const summary = `${summaryParts[0] ?? "Someone"} triggered ${event.event}.`;

  return {
    source: "posthog",
    category: "product_event",
    type: mapping.type,
    actor,
    title: mapping.title,
    summary,
    entity,
    data: {
      ...safeProperties,
      posthogEventName: event.event,
      deliveryId: event.deliveryId,
    },
    occurredAt: parseOccurredAt(event.timestamp),
    importance: mapping.importance,
    visibility: "primary",
    deliveryId: event.deliveryId,
    posthogEventName: event.event,
  };
}
