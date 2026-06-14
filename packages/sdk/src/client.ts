import { SortiriError } from "./errors";
import { formatRevenueSummary, revenueEntityType, titleFromType } from "./format";
import type {
  DecisionInput,
  EventInput,
  RecordEventResult,
  RevenueInput,
  SortiriConfig,
  TrackInput,
} from "./types";

export class Sortiri {
  constructor(private readonly config: SortiriConfig) {}

  async event(input: EventInput): Promise<RecordEventResult> {
    const body: Record<string, unknown> = {
      projectId: this.config.projectId || undefined,
      workstreamId: input.workstreamId,
      source: input.source ?? "sdk",
      category: input.category,
      type: input.type,
      actor: input.actor,
      title: input.title,
      summary: input.summary,
      entity: input.entity?.type
        ? {
            type: input.entity.type,
            id: input.entity.id,
            name: input.entity.name,
            url: input.entity.url,
          }
        : undefined,
      data: input.data,
      severity: input.severity,
      tags: input.tags,
      occurredAt: input.occurredAt ?? Date.now(),
    };

    if (this.config.workspaceId) {
      body.workspaceId = this.config.workspaceId;
    }

    return this.postEvent(body);
  }

  async track(input: TrackInput): Promise<RecordEventResult> {
    const customerId = input.userId ?? input.customerId;
    const title = input.title ?? titleFromType(input.type);

    return this.event({
      category: "product_event",
      type: input.type,
      actor: {
        type: "customer",
        id: customerId,
      },
      title,
      summary: input.summary,
      data: input.properties,
      tags: input.tags,
      occurredAt: input.occurredAt,
    });
  }

  async decision(input: DecisionInput): Promise<RecordEventResult> {
    const actorName = input.actorName ?? this.config.defaultActorName;

    return this.event({
      category: "company_decision",
      type: "decision.made",
      actor: {
        type: "human",
        id: input.actorId,
        name: actorName,
        email: input.actorEmail,
      },
      title: input.title,
      summary: input.summary,
      tags: input.tags,
      occurredAt: input.occurredAt,
    });
  }

  async revenue(input: RevenueInput): Promise<RecordEventResult> {
    const customerId = input.customerId;
    const title = input.title ?? titleFromType(input.type);
    const summary =
      input.summary ?? formatRevenueSummary(input.amount, input.currency);
    const entityType = revenueEntityType(input.type);
    const entityId =
      input.invoiceId ?? input.subscriptionId ?? customerId;

    return this.event({
      category: "revenue_event",
      type: input.type,
      actor: {
        type: "customer",
        id: customerId,
      },
      title,
      summary,
      entity: entityId
        ? {
            type: entityType,
            id: entityId,
          }
        : undefined,
      data: {
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.currency ? { currency: input.currency } : {}),
        ...(input.subscriptionId ? { subscriptionId: input.subscriptionId } : {}),
        ...(input.invoiceId ? { invoiceId: input.invoiceId } : {}),
        ...input.properties,
      },
      tags: input.tags,
      occurredAt: input.occurredAt,
    });
  }

  private async postEvent(body: Record<string, unknown>): Promise<RecordEventResult> {
    const apiUrl = this.config.apiUrl.replace(/\/$/, "");
    const response = await fetch(`${apiUrl}/api/ingest/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let payload: { eventId?: string; error?: string } | unknown = null;

    if (text) {
      try {
        payload = JSON.parse(text) as { eventId?: string; error?: string };
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      const message =
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof (payload as { error?: string }).error === "string"
          ? (payload as { error: string }).error
          : `Request failed with status ${response.status}`;
      throw new SortiriError(message, {
        status: response.status,
        response: payload,
      });
    }

    const eventId =
      typeof payload === "object" &&
      payload !== null &&
      "eventId" in payload &&
      typeof (payload as { eventId?: string }).eventId === "string"
        ? (payload as { eventId: string }).eventId
        : "";

    return { eventId };
  }
}
