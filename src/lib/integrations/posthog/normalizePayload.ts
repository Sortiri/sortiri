import { createHash } from "node:crypto";

export type PostHogNormalizedEvent = {
  event: string;
  uuid?: string;
  eventId?: string;
  distinctId?: string;
  timestamp?: string | number;
  properties?: Record<string, unknown>;
  person?: {
    id?: string;
    uuid?: string;
    properties?: Record<string, unknown>;
  };
  deliveryId: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function hashDeliveryId(parts: string[]): string {
  return `posthog:${createHash("sha256").update(parts.join("|"), "utf8").digest("hex").slice(0, 32)}`;
}

function normalizeSingle(raw: Record<string, unknown>): PostHogNormalizedEvent {
  const event = asString(raw.event);
  if (!event) {
    throw new Error("PostHog payload missing event name");
  }

  const distinctId =
    asString(raw.distinct_id) ??
    asString(raw.distinctId) ??
    asString((raw.person as Record<string, unknown> | undefined)?.id);

  const uuid = asString(raw.uuid);
  const eventId = asString(raw.event_id) ?? asString(raw.id);
  const timestamp = raw.timestamp as string | number | undefined;

  const deliveryId =
    uuid ??
    eventId ??
    hashDeliveryId([event, String(timestamp ?? ""), distinctId ?? ""]);

  return {
    event,
    uuid,
    eventId,
    distinctId,
    timestamp,
    properties: asRecord(raw.properties) ?? undefined,
    person: asRecord(raw.person) as PostHogNormalizedEvent["person"],
    deliveryId,
  };
}

export function normalizePostHogPayload(payload: unknown): PostHogNormalizedEvent[] {
  const root = asRecord(payload);
  if (!root) {
    throw new Error("PostHog payload must be a JSON object");
  }

  if (Array.isArray(root.events)) {
    return root.events
      .map((item) => {
        const record = asRecord(item);
        if (!record) throw new Error("PostHog events array contains invalid item");
        return normalizeSingle(record);
      });
  }

  const data = asRecord(root.data);
  if (data && asString(data.event)) {
    return [normalizeSingle(data)];
  }

  if (asString(root.event)) {
    return [normalizeSingle(root)];
  }

  throw new Error("Unrecognized PostHog webhook payload shape");
}
