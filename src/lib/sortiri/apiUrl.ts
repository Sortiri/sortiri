/**
 * Resolve the Convex HTTP API base URL for CLI, SDK, MCP, and webhook setup UI.
 */
export function getSortiriApiUrl(): string {
  const fromEnv =
    process.env.SORTIRI_API_URL ??
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
    process.env.CONVEX_SITE_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  return "https://your-deployment.convex.site";
}

export function buildWebhookUrl(
  source: "github" | "stripe" | "posthog" | "slack" | "observability",
  workspaceId: string,
): string {
  return `${getSortiriApiUrl()}/webhooks/${source}?workspaceId=${encodeURIComponent(workspaceId)}`;
}

export function buildIngestEventsUrl(): string {
  return `${getSortiriApiUrl()}/ingest/events`;
}
