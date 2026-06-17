import type { Id } from "../../convex/_generated/dataModel";
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

export const AUTONOMY_OWNER_EMAIL = "sortiri-sanity-autonomy-owner@agentmail.to";
export const AUTONOMY_VIEWER_EMAIL = "sortiri-sanity-autonomy-viewer@agentmail.to";
export const AUTONOMY_AUDITOR_EMAIL = "sortiri-sanity-autonomy-auditor@agentmail.to";

export type HttpRecommendationResponse = {
  recommendations?: Array<{ id: string; title: string; summary?: string }>;
  recommendation?: { id: string; title: string; summary?: string };
  createdIds?: string[];
  count?: number;
  workstreamId?: string;
  contextPackId?: string;
  error?: string;
};

export function assertRecommendationSections(rec: {
  title?: string;
  summary?: string;
  reason?: string;
}): void {
  if (!rec.title?.trim()) throw new Error("Recommendation missing title");
  if (!rec.summary?.trim()) throw new Error("Recommendation missing summary");
}

export async function getRecommendationsRoute(
  appUrl: string,
  workspaceId: string,
  rawKey: string,
): Promise<Response> {
  const params = new URLSearchParams({ workspaceId });
  return fetch(`${appUrl}/cli/recommendations?${params.toString()}`, {
    headers: { Authorization: `Bearer ${rawKey}` },
  });
}

export async function postRecommendationRoute(
  appUrl: string,
  route: string,
  body: Record<string, unknown>,
  rawKey?: string,
): Promise<Response> {
  return postContextRoute(appUrl, route, body, rawKey);
}

export async function generateRecommendationsViaHttp(
  appUrl: string,
  rawKey: string,
  workspaceId: string,
): Promise<HttpRecommendationResponse> {
  const response = await postRecommendationRoute(
    appUrl,
    "/cli/recommendations/generate",
    { workspaceId },
    rawKey,
  );
  const payload = (await response.json().catch(() => null)) as HttpRecommendationResponse | null;
  if (!response.ok) {
    throw new Error(
      `HTTP generate recommendations failed: ${response.status} ${payload?.error ?? ""}`.trim(),
    );
  }
  return payload ?? {};
}

export async function getRecommendationViaHttp(
  appUrl: string,
  rawKey: string,
  workspaceId: string,
  recommendationId: string,
): Promise<HttpRecommendationResponse> {
  const params = new URLSearchParams({ workspaceId });
  const response = await fetch(
    `${appUrl}/cli/recommendations/${recommendationId}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${rawKey}` } },
  );
  const payload = (await response.json().catch(() => null)) as HttpRecommendationResponse | null;
  if (!response.ok) {
    throw new Error(
      `HTTP get recommendation failed: ${response.status} ${payload?.error ?? ""}`.trim(),
    );
  }
  return payload ?? {};
}

export async function convertRecommendationViaHttp(
  appUrl: string,
  rawKey: string,
  workspaceId: string,
  recommendationId: string,
): Promise<HttpRecommendationResponse> {
  const response = await postRecommendationRoute(
    appUrl,
    `/cli/recommendations/${recommendationId}/convert`,
    { workspaceId },
    rawKey,
  );
  const payload = (await response.json().catch(() => null)) as HttpRecommendationResponse | null;
  if (!response.ok) {
    throw new Error(
      `HTTP convert recommendation failed: ${response.status} ${payload?.error ?? ""}`.trim(),
    );
  }
  return payload ?? {};
}

export {
  assertNoSecrets,
  completeOnboarding,
  convexClient,
  ensureClerkUser,
  getAppUrl,
  getConvexTokenForUser,
  loadEnvLocal,
  maskApiKey,
  requireLocalApp,
};

export type { Id };
