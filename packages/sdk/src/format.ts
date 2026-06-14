export function titleFromType(type: string): string {
  const parts = type.split(".").filter(Boolean);
  if (parts.length === 0) return type;

  return parts
    .map((part) =>
      part
        .split(/[_-]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    )
    .join(" ");
}

export function formatRevenueSummary(amount?: number, currency?: string): string | undefined {
  if (amount === undefined) return undefined;
  const code = currency ?? "USD";
  return `Customer paid $${amount} ${code}.`;
}

export function revenueEntityType(
  type: string,
): "payment" | "subscription" | "other" {
  if (type.startsWith("payment.") || type.startsWith("invoice.") || type.startsWith("refund.")) {
    return "payment";
  }
  if (type.startsWith("subscription.")) {
    return "subscription";
  }
  return "other";
}
