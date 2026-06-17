type EventActor = {
  type: "agent" | "human" | "system" | "customer";
  id?: string;
  name?: string;
  email?: string;
};

type EventCategory =
  | "agent_action"
  | "code_change"
  | "company_decision"
  | "product_event"
  | "revenue_event"
  | "system_event"
  | "integration_event"
  | "other";

import {
  checkoutDashboardUrl,
  customerDashboardUrl,
  invoiceDashboardUrl,
  paymentDashboardUrl,
  stripeDashboardUrl,
  subscriptionDashboardUrl,
} from "./stripeDashboardUrls";

export type StripeSortiriEventInput = {
  source: "stripe";
  category: EventCategory;
  type: string;
  actor: EventActor;
  title: string;
  summary?: string;
  entity?: {
    type:
      | "customer"
      | "payment"
      | "subscription"
      | "other";
    id?: string;
    name?: string;
    url?: string;
  };
  data?: Record<string, unknown>;
  occurredAt?: number;
  severity?: "info" | "warning" | "error" | "critical";
  importance?: "low" | "normal" | "high";
  visibility?: "primary" | "debug" | "hidden";
};

type StripeWebhookEvent = {
  id?: string;
  type?: string;
  livemode?: boolean;
  created?: number;
  data?: { object?: unknown };
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function majorAmount(cents: unknown): number | undefined {
  const value = asNumber(cents);
  if (value === undefined) return undefined;
  return value / 100;
}

function formatMoney(amount: number | undefined, currency: string | undefined): string {
  if (amount === undefined) return "an unknown amount";
  const code = (currency ?? "usd").toUpperCase();
  return `${amount.toFixed(2)} ${code}`;
}

function customerActor(
  customerId: string | undefined,
  customerEmail: string | undefined,
): EventActor {
  return {
    type: "customer",
    id: customerId,
    name: customerEmail ?? customerId ?? "Customer",
    email: customerEmail,
  };
}

function baseData(
  stripeEvent: StripeWebhookEvent,
  object: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    stripeEventId: stripeEvent.id,
    livemode: stripeEvent.livemode,
    ...extra,
  };

  const customerId = asString(object.customer) ?? asString(extra.customerId);
  if (customerId) data.customerId = customerId;

  const currency = asString(object.currency) ?? asString(extra.currency);
  if (currency) data.currency = currency;

  return data;
}

function mapCheckoutSessionCompleted(
  stripeEvent: StripeWebhookEvent,
  session: Record<string, unknown>,
): StripeSortiriEventInput {
  const sessionId = asString(session.id) ?? "unknown";
  const customerId = asString(session.customer);
  const customerEmail =
    asString(session.customer_email) ??
    asString(asRecord(session.customer_details)?.email);
  const amountTotal = majorAmount(session.amount_total);
  const currency = asString(session.currency);
  const livemode = stripeEvent.livemode;

  return {
    source: "stripe",
    category: "revenue_event",
    type: "stripe.checkout.session.completed",
    actor: customerActor(customerId, customerEmail),
    title: "Checkout completed",
    summary: `${customerEmail ?? customerId ?? "A customer"} completed checkout for ${formatMoney(amountTotal, currency)}.`,
    entity: {
      type: "payment",
      id: sessionId,
      name: `Checkout ${sessionId}`,
      url: checkoutDashboardUrl(sessionId, livemode),
    },
    data: baseData(stripeEvent, session, {
      mode: asString(session.mode),
      amountTotal,
      amountCents: asNumber(session.amount_total),
      customerEmail,
      paymentStatus: asString(session.payment_status),
      subscriptionId: asString(session.subscription),
      paymentIntentId: asString(session.payment_intent),
      sessionId,
    }),
    occurredAt: stripeEvent.created ? stripeEvent.created * 1000 : undefined,
    importance: "high",
    visibility: "primary",
  };
}

function mapPaymentIntentSucceeded(
  stripeEvent: StripeWebhookEvent,
  paymentIntent: Record<string, unknown>,
): StripeSortiriEventInput {
  const paymentIntentId = asString(paymentIntent.id) ?? "unknown";
  const customerId = asString(paymentIntent.customer);
  const amount = majorAmount(paymentIntent.amount);
  const currency = asString(paymentIntent.currency);
  const livemode = stripeEvent.livemode;

  return {
    source: "stripe",
    category: "revenue_event",
    type: "stripe.payment_intent.succeeded",
    actor: customerActor(customerId, asString(paymentIntent.receipt_email)),
    title: "Payment succeeded",
    summary: `Payment succeeded for ${formatMoney(amount, currency)}.`,
    entity: {
      type: "payment",
      id: paymentIntentId,
      name: `Payment ${paymentIntentId}`,
      url: paymentDashboardUrl(paymentIntentId, livemode),
    },
    data: baseData(stripeEvent, paymentIntent, {
      paymentIntentId,
      amount,
      amountCents: asNumber(paymentIntent.amount),
      latestCharge: asString(paymentIntent.latest_charge),
    }),
    occurredAt: stripeEvent.created ? stripeEvent.created * 1000 : undefined,
    importance: "high",
    visibility: "primary",
  };
}

function mapPaymentIntentFailed(
  stripeEvent: StripeWebhookEvent,
  paymentIntent: Record<string, unknown>,
): StripeSortiriEventInput {
  const paymentIntentId = asString(paymentIntent.id) ?? "unknown";
  const customerId = asString(paymentIntent.customer);
  const amount = majorAmount(paymentIntent.amount);
  const currency = asString(paymentIntent.currency);
  const livemode = stripeEvent.livemode;
  const lastError = asRecord(paymentIntent.last_payment_error);
  const failureMessage = asString(lastError?.message);

  return {
    source: "stripe",
    category: "revenue_event",
    type: "stripe.payment_intent.payment_failed",
    actor: customerActor(customerId, asString(paymentIntent.receipt_email)),
    title: "Payment failed",
    summary: failureMessage
      ? `Payment failed: ${failureMessage}`
      : `Payment failed for ${formatMoney(amount, currency)}.`,
    entity: {
      type: "payment",
      id: paymentIntentId,
      name: `Payment ${paymentIntentId}`,
      url: paymentDashboardUrl(paymentIntentId, livemode),
    },
    data: baseData(stripeEvent, paymentIntent, {
      paymentIntentId,
      amount,
      amountCents: asNumber(paymentIntent.amount),
      latestCharge: asString(paymentIntent.latest_charge),
      failureMessage,
    }),
    occurredAt: stripeEvent.created ? stripeEvent.created * 1000 : undefined,
    severity: "warning",
    importance: "high",
    visibility: "primary",
  };
}

function mapInvoicePaid(
  stripeEvent: StripeWebhookEvent,
  invoice: Record<string, unknown>,
): StripeSortiriEventInput {
  const invoiceId = asString(invoice.id) ?? "unknown";
  const customerId = asString(invoice.customer);
  const subscriptionId = asString(invoice.subscription);
  const amountPaid = majorAmount(invoice.amount_paid);
  const currency = asString(invoice.currency);
  const livemode = stripeEvent.livemode;

  return {
    source: "stripe",
    category: "revenue_event",
    type: "stripe.invoice.paid",
    actor: customerActor(customerId, asString(invoice.customer_email)),
    title: "Invoice paid",
    summary: `Invoice paid for ${formatMoney(amountPaid, currency)}.`,
    entity: subscriptionId
      ? {
          type: "subscription",
          id: subscriptionId,
          name: `Subscription ${subscriptionId}`,
          url: subscriptionDashboardUrl(subscriptionId, livemode),
        }
      : {
          type: "payment",
          id: invoiceId,
          name: `Invoice ${invoiceId}`,
          url: invoiceDashboardUrl(invoiceId, livemode),
        },
    data: baseData(stripeEvent, invoice, {
      invoiceId,
      subscriptionId,
      amountPaid,
      amountCents: asNumber(invoice.amount_paid),
      billingReason: asString(invoice.billing_reason),
      hostedInvoiceUrl: asString(invoice.hosted_invoice_url),
    }),
    occurredAt: stripeEvent.created ? stripeEvent.created * 1000 : undefined,
    importance: "high",
    visibility: "primary",
  };
}

function mapInvoicePaymentFailed(
  stripeEvent: StripeWebhookEvent,
  invoice: Record<string, unknown>,
): StripeSortiriEventInput {
  const invoiceId = asString(invoice.id) ?? "unknown";
  const customerId = asString(invoice.customer);
  const subscriptionId = asString(invoice.subscription);
  const amountDue = majorAmount(invoice.amount_due);
  const currency = asString(invoice.currency);
  const livemode = stripeEvent.livemode;

  return {
    source: "stripe",
    category: "revenue_event",
    type: "stripe.invoice.payment_failed",
    actor: customerActor(customerId, asString(invoice.customer_email)),
    title: "Invoice payment failed",
    summary: `Invoice payment failed for ${formatMoney(amountDue, currency)}.`,
    entity: {
      type: "payment",
      id: invoiceId,
      name: `Invoice ${invoiceId}`,
      url: invoiceDashboardUrl(invoiceId, livemode),
    },
    data: baseData(stripeEvent, invoice, {
      invoiceId,
      subscriptionId,
      amountDue,
      amountCents: asNumber(invoice.amount_due),
      billingReason: asString(invoice.billing_reason),
      hostedInvoiceUrl: asString(invoice.hosted_invoice_url),
    }),
    occurredAt: stripeEvent.created ? stripeEvent.created * 1000 : undefined,
    severity: "warning",
    importance: "high",
    visibility: "primary",
  };
}

function mapSubscriptionCreated(
  stripeEvent: StripeWebhookEvent,
  subscription: Record<string, unknown>,
): StripeSortiriEventInput {
  const subscriptionId = asString(subscription.id) ?? "unknown";
  const customerId = asString(subscription.customer);
  const livemode = stripeEvent.livemode;
  const items = asRecord(subscription.items);
  const itemData = items?.data;
  const priceIds = Array.isArray(itemData)
    ? itemData
        .map((item) => asString(asRecord(asRecord(item)?.price)?.id))
        .filter((id): id is string => Boolean(id))
    : [];

  return {
    source: "stripe",
    category: "revenue_event",
    type: "stripe.customer.subscription.created",
    actor: customerActor(customerId, undefined),
    title: "Subscription created",
    summary: `Subscription ${subscriptionId} was created.`,
    entity: {
      type: "subscription",
      id: subscriptionId,
      name: `Subscription ${subscriptionId}`,
      url: subscriptionDashboardUrl(subscriptionId, livemode),
    },
    data: baseData(stripeEvent, subscription, {
      subscriptionId,
      status: asString(subscription.status),
      currentPeriodStart: asNumber(subscription.current_period_start),
      currentPeriodEnd: asNumber(subscription.current_period_end),
      priceIds,
    }),
    occurredAt: stripeEvent.created ? stripeEvent.created * 1000 : undefined,
    importance: "high",
    visibility: "primary",
  };
}

function mapSubscriptionUpdated(
  stripeEvent: StripeWebhookEvent,
  subscription: Record<string, unknown>,
): StripeSortiriEventInput {
  const subscriptionId = asString(subscription.id) ?? "unknown";
  const customerId = asString(subscription.customer);
  const status = asString(subscription.status);
  const livemode = stripeEvent.livemode;
  const highRiskStatus =
    status === "canceled" || status === "past_due" || status === "unpaid";

  return {
    source: "stripe",
    category: "revenue_event",
    type: "stripe.customer.subscription.updated",
    actor: customerActor(customerId, undefined),
    title: "Subscription updated",
    summary: `Subscription ${subscriptionId} updated to ${status ?? "unknown"}.`,
    entity: {
      type: "subscription",
      id: subscriptionId,
      name: `Subscription ${subscriptionId}`,
      url: subscriptionDashboardUrl(subscriptionId, livemode),
    },
    data: baseData(stripeEvent, subscription, {
      subscriptionId,
      status,
      currentPeriodStart: asNumber(subscription.current_period_start),
      currentPeriodEnd: asNumber(subscription.current_period_end),
    }),
    occurredAt: stripeEvent.created ? stripeEvent.created * 1000 : undefined,
    importance: highRiskStatus ? "high" : "normal",
    visibility: "primary",
  };
}

function mapSubscriptionDeleted(
  stripeEvent: StripeWebhookEvent,
  subscription: Record<string, unknown>,
): StripeSortiriEventInput {
  const subscriptionId = asString(subscription.id) ?? "unknown";
  const customerId = asString(subscription.customer);
  const livemode = stripeEvent.livemode;

  return {
    source: "stripe",
    category: "revenue_event",
    type: "stripe.customer.subscription.deleted",
    actor: customerActor(customerId, undefined),
    title: "Subscription canceled",
    summary: `Subscription ${subscriptionId} was canceled.`,
    entity: {
      type: "subscription",
      id: subscriptionId,
      name: `Subscription ${subscriptionId}`,
      url: subscriptionDashboardUrl(subscriptionId, livemode),
    },
    data: baseData(stripeEvent, subscription, {
      subscriptionId,
      status: asString(subscription.status),
    }),
    occurredAt: stripeEvent.created ? stripeEvent.created * 1000 : undefined,
    importance: "high",
    visibility: "primary",
  };
}

function mapChargeRefunded(
  stripeEvent: StripeWebhookEvent,
  charge: Record<string, unknown>,
): StripeSortiriEventInput {
  const chargeId = asString(charge.id) ?? "unknown";
  const customerId = asString(charge.customer);
  const paymentIntentId = asString(charge.payment_intent);
  const amountRefunded = majorAmount(charge.amount_refunded);
  const currency = asString(charge.currency);
  const livemode = stripeEvent.livemode;

  return {
    source: "stripe",
    category: "revenue_event",
    type: "stripe.charge.refunded",
    actor: customerActor(customerId, asString(charge.receipt_email)),
    title: "Payment refunded",
    summary: `Refund issued for ${formatMoney(amountRefunded, currency)}.`,
    entity: {
      type: "payment",
      id: paymentIntentId ?? chargeId,
      name: paymentIntentId ? `Payment ${paymentIntentId}` : `Charge ${chargeId}`,
      url: paymentIntentId
        ? paymentDashboardUrl(paymentIntentId, livemode)
        : stripeEvent.livemode !== undefined
          ? stripeDashboardUrl(`/payments/${chargeId}`, livemode)
          : undefined,
    },
    data: baseData(stripeEvent, charge, {
      chargeId,
      paymentIntentId,
      amountRefunded,
      amountCents: asNumber(charge.amount_refunded),
      refunded: charge.refunded === true,
    }),
    occurredAt: stripeEvent.created ? stripeEvent.created * 1000 : undefined,
    importance: "high",
    visibility: "primary",
  };
}

function mapCustomerEvent(
  stripeEvent: StripeWebhookEvent,
  customer: Record<string, unknown>,
  type: "stripe.customer.created" | "stripe.customer.updated",
): StripeSortiriEventInput {
  const customerId = asString(customer.id) ?? "unknown";
  const customerEmail = asString(customer.email);
  const livemode = stripeEvent.livemode;

  return {
    source: "stripe",
    category: "product_event",
    type,
    actor: customerActor(customerId, customerEmail),
    title: type === "stripe.customer.created" ? "Customer created" : "Customer updated",
    summary: customerEmail
      ? `Customer ${customerEmail} was ${type.endsWith("created") ? "created" : "updated"}.`
      : `Customer ${customerId} was ${type.endsWith("created") ? "created" : "updated"}.`,
    entity: {
      type: "customer",
      id: customerId,
      name: customerEmail ?? customerId,
      url: customerDashboardUrl(customerId, livemode),
    },
    data: baseData(stripeEvent, customer, {
      customerEmail,
    }),
    occurredAt: stripeEvent.created ? stripeEvent.created * 1000 : undefined,
    visibility: "primary",
  };
}

export function mapStripeWebhook(
  eventType: string,
  payload: unknown,
): StripeSortiriEventInput | null {
  const stripeEvent = (typeof payload === "object" && payload !== null
    ? payload
    : null) as StripeWebhookEvent | null;
  if (!stripeEvent) return null;

  const object = asRecord(stripeEvent.data?.object);
  if (!object) return null;

  switch (eventType) {
    case "checkout.session.completed":
      return mapCheckoutSessionCompleted(stripeEvent, object);
    case "payment_intent.succeeded":
      return mapPaymentIntentSucceeded(stripeEvent, object);
    case "payment_intent.payment_failed":
      return mapPaymentIntentFailed(stripeEvent, object);
    case "invoice.paid":
      return mapInvoicePaid(stripeEvent, object);
    case "invoice.payment_failed":
      return mapInvoicePaymentFailed(stripeEvent, object);
    case "customer.subscription.created":
      return mapSubscriptionCreated(stripeEvent, object);
    case "customer.subscription.updated":
      return mapSubscriptionUpdated(stripeEvent, object);
    case "customer.subscription.deleted":
      return mapSubscriptionDeleted(stripeEvent, object);
    case "charge.refunded":
      return mapChargeRefunded(stripeEvent, object);
    case "customer.created":
      return mapCustomerEvent(stripeEvent, object, "stripe.customer.created");
    case "customer.updated":
      return mapCustomerEvent(stripeEvent, object, "stripe.customer.updated");
    default:
      return null;
  }
}
