export const STRIPE_WEBHOOK_SECRET_PREFIX = "whsec_";

export type StripeWebhookSecretStatus = "active" | "revoked";

export type StripeConnectionStatus =
  | "connected"
  | "not_connected"
  | "error"
  | "revoked";

export type StripeWebhookSecretRecord = {
  id: string;
  workspaceId: string;
  maskedSecret: string;
  secretLast4: string;
  status: StripeWebhookSecretStatus;
  createdAt: number;
  updatedAt: number;
};

export type StripeStatus = {
  connectionStatus: StripeConnectionStatus;
  maskedSecret?: string;
  secretLast4?: string;
  secretStatus?: StripeWebhookSecretStatus;
  eventCount: number;
  lastEventAt?: number;
  lastError?: string;
};

export type SaveStripeWebhookSecretResult = {
  ok: true;
  last4: string;
};

export const STRIPE_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "charge.refunded",
  "customer.created",
  "customer.updated",
] as const;
