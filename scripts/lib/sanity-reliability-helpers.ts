import { api } from "../../convex/_generated/api";
import {
  assertNoSecrets,
  completeOnboarding,
  convexClient,
  ensureClerkUser,
  getAppUrl,
  getConvexTokenForUser,
  loadEnvLocal,
  maskApiKey,
  postContextRoute,
  requireLocalApp,
} from "./sanity-context-helpers.js";
import {
  AUTONOMY_AUDITOR_EMAIL,
  AUTONOMY_OWNER_EMAIL,
  AUTONOMY_VIEWER_EMAIL,
} from "./sanity-recommendation-helpers.js";
import { API_KEY_PREFIX } from "../../src/types/api-keys";

export {
  assertNoSecrets,
  AUTONOMY_AUDITOR_EMAIL,
  AUTONOMY_OWNER_EMAIL,
  AUTONOMY_VIEWER_EMAIL,
  completeOnboarding,
  convexClient,
  ensureClerkUser,
  getAppUrl,
  getConvexTokenForUser,
  loadEnvLocal,
  maskApiKey,
  requireLocalApp,
};

export type HttpReliabilityResponse = {
  ok?: boolean;
  duplicate?: boolean;
  eventId?: string;
  deliveryId?: string;
  status?: string;
  journalRef?: string;
  deliveries?: unknown[];
  delivery?: Record<string, unknown>;
  deadLetters?: unknown[];
  entries?: unknown[];
  health?: Record<string, unknown>;
  error?: string;
};

export function getDevIngestKey(): string {
  const key = process.env.SORTIRI_DEV_INGEST_KEY?.trim();
  if (!key) {
    throw new Error("Missing SORTIRI_DEV_INGEST_KEY");
  }
  return key;
}

export function sampleReliabilityEvent(sourceEventId: string) {
  return {
    source: "cli",
    sourceEventId,
    category: "agent_action",
    type: "reliability_sanity",
    actor: { type: "agent", name: "Reliability Sanity" },
    title: "Enterprise reliability sanity event",
    summary: "Sprint 37 ingest journal + delivery tracking",
    tags: ["reliability", "sanity"],
  };
}

export function getConvexHttpUrl(): string {
  const url =
    process.env.SORTIRI_API_URL ??
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
    process.env.CONVEX_SITE_URL;
  if (!url) {
    throw new Error("Set SORTIRI_API_URL or NEXT_PUBLIC_CONVEX_SITE_URL for Convex HTTP tests");
  }
  return url.replace(/\/$/, "");
}

export async function postIngestEventViaHttp(
  apiUrl: string,
  rawKey: string,
  workspaceId: string,
  body: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<HttpReliabilityResponse> {
  const response = await fetch(`${apiUrl}/ingest/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${rawKey}`,
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
    body: JSON.stringify({ workspaceId, ...body }),
  });
  const payload = (await response.json().catch(() => null)) as HttpReliabilityResponse | null;
  if (!response.ok) {
    throw new Error(
      `HTTP ingest failed: ${response.status} ${payload?.error ?? ""}`.trim(),
    );
  }
  return payload ?? {};
}

export async function getReliabilityDeliveriesViaHttp(
  appUrl: string,
  rawKey: string,
  workspaceId: string,
  query?: { status?: string; source?: string; limit?: number },
): Promise<HttpReliabilityResponse> {
  const params = new URLSearchParams({ workspaceId });
  if (query?.status) params.set("status", query.status);
  if (query?.source) params.set("source", query.source);
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  const response = await fetch(`${appUrl}/cli/reliability?${params.toString()}`, {
    headers: { Authorization: `Bearer ${rawKey}` },
  });
  const payload = (await response.json().catch(() => null)) as HttpReliabilityResponse | null;
  if (!response.ok) {
    throw new Error(
      `HTTP list deliveries failed: ${response.status} ${payload?.error ?? ""}`.trim(),
    );
  }
  return payload ?? {};
}

export async function getReliabilityDeadLettersViaHttp(
  appUrl: string,
  rawKey: string,
  workspaceId: string,
  query?: { status?: string; limit?: number },
): Promise<HttpReliabilityResponse> {
  const params = new URLSearchParams({ workspaceId });
  if (query?.status) params.set("status", query.status);
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  const response = await fetch(
    `${appUrl}/cli/reliability/dead-letters?${params.toString()}`,
    { headers: { Authorization: `Bearer ${rawKey}` } },
  );
  const payload = (await response.json().catch(() => null)) as HttpReliabilityResponse | null;
  if (!response.ok) {
    throw new Error(
      `HTTP list dead letters failed: ${response.status} ${payload?.error ?? ""}`.trim(),
    );
  }
  return payload ?? {};
}

export async function getReliabilityHealthViaHttp(
  appUrl: string,
  rawKey: string,
  workspaceId: string,
): Promise<HttpReliabilityResponse> {
  const params = new URLSearchParams({ workspaceId });
  const response = await fetch(
    `${appUrl}/cli/reliability/health?${params.toString()}`,
    { headers: { Authorization: `Bearer ${rawKey}` } },
  );
  const payload = (await response.json().catch(() => null)) as HttpReliabilityResponse | null;
  if (!response.ok) {
    throw new Error(
      `HTTP reliability health failed: ${response.status} ${payload?.error ?? ""}`.trim(),
    );
  }
  return payload ?? {};
}

export async function listJournalEntriesViaHttp(
  appUrl: string,
  rawKey: string,
  workspaceId: string,
  query?: { source?: string; limit?: number },
): Promise<HttpReliabilityResponse> {
  const params = new URLSearchParams({ workspaceId });
  if (query?.source) params.set("source", query.source);
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  const response = await fetch(
    `${appUrl}/cli/reliability/journal/list?${params.toString()}`,
    { headers: { Authorization: `Bearer ${rawKey}` } },
  );
  const payload = (await response.json().catch(() => null)) as HttpReliabilityResponse | null;
  if (!response.ok) {
    throw new Error(
      `HTTP journal list failed: ${response.status} ${payload?.error ?? ""}`.trim(),
    );
  }
  return payload ?? {};
}

export async function replayReliabilityViaHttp(
  appUrl: string,
  rawKey: string,
  workspaceId: string,
  body: Record<string, unknown>,
): Promise<HttpReliabilityResponse> {
  const response = await postContextRoute(
    appUrl,
    "/cli/reliability/replay",
    { workspaceId, ...body },
    rawKey,
  );
  const payload = (await response.json().catch(() => null)) as HttpReliabilityResponse | null;
  if (!response.ok) {
    throw new Error(
      `HTTP replay failed: ${response.status} ${payload?.error ?? ""}`.trim(),
    );
  }
  return payload ?? {};
}

export async function seedReliabilityWorkspace(ownerClient: ReturnType<typeof convexClient>) {
  const story = await ownerClient.mutation(api.testSeed.seedTestWorkspace, {});
  return story;
}

export async function getWorkspaceExternalId(
  ownerClient: ReturnType<typeof convexClient>,
): Promise<string> {
  const state = await ownerClient.query(api.workspaces.getState, {});
  if (!state.activeWorkspaceId) throw new Error("Workspace external id missing");
  return state.activeWorkspaceId;
}

export type ReliabilityEvidence = {
  workspaceId: string;
  deliveryId?: string;
  eventId?: string;
  journalRef?: string;
  sourceEventId: string;
  maskedApiKey: string;
  maskedDevKey: string;
};

export function assertMaskedKey(rawKey: string): string {
  const masked = maskApiKey(rawKey);
  if (masked.includes(rawKey)) {
    throw new Error("API key was not masked");
  }
  return masked;
}

export function maskDevIngestKey(rawKey: string): string {
  const last4 = rawKey.slice(-4);
  return `dev_ingest_••••${last4}`;
}

export async function createSanityApiKey(
  ownerClient: ReturnType<typeof convexClient>,
  workspaceExternalId: string,
): Promise<string> {
  const result = await ownerClient.mutation(api.apiKeys.create, {
    workspaceId: workspaceExternalId,
    name: "Sprint 37 Reliability Sanity Key",
  });
  return result.rawKey;
}
