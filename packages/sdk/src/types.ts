export type SortiriConfig = {
  apiUrl: string;
  apiKey: string;
  workspaceId?: string;
  projectId?: string;
  defaultActorName?: string;
};

export type EventActor = {
  type: "agent" | "human" | "system" | "customer";
  id?: string;
  name?: string;
  email?: string;
};

export type EventEntity = {
  type?: string;
  id?: string;
  name?: string;
  url?: string;
};

export type EventInput = {
  source?: string;
  category: string;
  type: string;
  actor: EventActor;
  title: string;
  summary?: string;
  entity?: EventEntity;
  data?: Record<string, unknown>;
  severity?: "info" | "warning" | "error" | "critical";
  tags?: string[];
  occurredAt?: number;
  workstreamId?: string;
};

export type TrackInput = {
  type: string;
  title?: string;
  summary?: string;
  userId?: string;
  customerId?: string;
  properties?: Record<string, unknown>;
  occurredAt?: number;
  tags?: string[];
};

export type DecisionInput = {
  title: string;
  summary?: string;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  tags?: string[];
  occurredAt?: number;
};

export type RevenueInput = {
  type:
    | "payment.received"
    | "subscription.created"
    | "subscription.cancelled"
    | "invoice.paid"
    | "refund.issued"
    | string;
  title?: string;
  summary?: string;
  amount?: number;
  currency?: string;
  customerId?: string;
  subscriptionId?: string;
  invoiceId?: string;
  properties?: Record<string, unknown>;
  occurredAt?: number;
  tags?: string[];
};

export type RecordEventResult = {
  eventId: string;
};
