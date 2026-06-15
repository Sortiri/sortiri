const ALLOWED_EXACT = new Set([
  "$email",
  "$name",
  "$browser",
  "$os",
  "$device_type",
  "$pathname",
  "$current_url",
  "$host",
  "$referrer",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "plan",
  "workspaceId",
  "workspace_id",
  "projectId",
  "project_id",
  "feature",
  "feature_key",
  "feature_name",
  "page",
  "screen",
  "button",
  "path",
  "value",
  "distinctId",
  "customer_id",
  "customerId",
]);

const BLOCKED_SUBSTRINGS = [
  "password",
  "secret",
  "token",
  "credit_card",
  "card_number",
  "ssn",
  "phone",
  "address",
  "billing_address",
  "raw_payload",
  "ip_address",
  "$ip",
];

function isAllowedKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (ALLOWED_EXACT.has(key)) return true;
  if (lower.startsWith("utm_")) return true;
  if (lower.startsWith("feature")) return true;
  return false;
}

function isBlockedKey(key: string): boolean {
  const lower = key.toLowerCase();
  return BLOCKED_SUBSTRINGS.some((blocked) => lower.includes(blocked));
}

function normalizeSafeKey(key: string): string {
  return key.startsWith("$") ? key.slice(1) : key;
}

export function selectPostHogSafeProperties(
  properties: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!properties) return {};

  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (isBlockedKey(key)) continue;
    if (!isAllowedKey(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === "object" && !Array.isArray(value)) continue;
    if (typeof value === "string" && value.length > 500) continue;
    safe[normalizeSafeKey(key)] = value;
  }
  return safe;
}
