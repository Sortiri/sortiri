export function stripeDashboardUrl(
  resourcePath: string,
  livemode?: boolean | null,
): string | undefined {
  if (livemode === undefined || livemode === null) {
    return undefined;
  }
  const prefix = livemode ? "https://dashboard.stripe.com" : "https://dashboard.stripe.com/test";
  const path = resourcePath.startsWith("/") ? resourcePath : `/${resourcePath}`;
  return `${prefix}${path}`;
}

export function paymentDashboardUrl(
  paymentIntentId: string,
  livemode?: boolean | null,
): string | undefined {
  return stripeDashboardUrl(`/payments/${paymentIntentId}`, livemode);
}

export function customerDashboardUrl(
  customerId: string,
  livemode?: boolean | null,
): string | undefined {
  return stripeDashboardUrl(`/customers/${customerId}`, livemode);
}

export function subscriptionDashboardUrl(
  subscriptionId: string,
  livemode?: boolean | null,
): string | undefined {
  return stripeDashboardUrl(`/subscriptions/${subscriptionId}`, livemode);
}

export function invoiceDashboardUrl(
  invoiceId: string,
  livemode?: boolean | null,
): string | undefined {
  return stripeDashboardUrl(`/invoices/${invoiceId}`, livemode);
}

export function checkoutDashboardUrl(
  sessionId: string,
  livemode?: boolean | null,
): string | undefined {
  return stripeDashboardUrl(`/checkout/sessions/${sessionId}`, livemode);
}
