/**
 * Sprint 29 PostHog integration sanity check.
 *
 * Usage: npx tsx scripts/sanity-posthog-integration.ts
 */

import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { exportJsonString } from "../src/lib/audits/exportJson";

const PASSWORD = "SortiriSanity!posthog-integration-2026";
const OWNER_EMAIL = "sortiri-sanity-posthog-owner@agentmail.to";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index);
    let value = trimmed.slice(index + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function clerkFetch<T>(route: string, init?: RequestInit): Promise<T> {
  const clerkSecret = requireEnv("CLERK_SECRET_KEY");
  const response = await fetch(`https://api.clerk.com/v1${route}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${clerkSecret}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Clerk ${route} failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

async function ensureClerkUser(email: string, firstName: string): Promise<string> {
  const listed = await clerkFetch<Array<{ id: string }>>(
    `/users?email_address=${encodeURIComponent(email)}`,
  );
  if (listed.length > 0) {
    await clerkFetch(`/users/${listed[0]!.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        password: PASSWORD,
        skip_password_checks: true,
        first_name: firstName,
      }),
    });
    return listed[0]!.id;
  }
  const created = await clerkFetch<{ id: string }>("/users", {
    method: "POST",
    body: JSON.stringify({
      email_address: [email],
      password: PASSWORD,
      skip_password_checks: true,
      skip_password_requirement: true,
      first_name: firstName,
    }),
  });
  return created.id;
}

async function getConvexTokenForUser(userId: string): Promise<string> {
  const session = await clerkFetch<{ id: string }>("/sessions", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
  const tokenResponse = await clerkFetch<{ jwt: string }>(
    `/sessions/${session.id}/tokens/convex`,
    { method: "POST", body: JSON.stringify({}) },
  );
  return tokenResponse.jwt;
}

function client(token: string) {
  const c = new ConvexHttpClient(requireEnv("NEXT_PUBLIC_CONVEX_URL"));
  c.setAuth(token);
  return c;
}

async function completeOnboarding(c: ConvexHttpClient) {
  const profile = await c.query(api.onboarding.getProfile, {});
  if (!profile?.completedAt) {
    await c.mutation(api.onboarding.upsert, {
      patch: {
        companyName: "PostHog Product Co",
        companyType: "SaaS",
        trackTypes: ["Product"],
        tools: ["PostHog"],
        exampleQuestion: "What product events happened recently?",
        currentStep: 5,
      },
    });
    await c.mutation(api.onboarding.complete, {});
  }
}

async function postPostHogWebhook(
  apiUrl: string,
  workspaceId: string,
  webhookSecret: string,
  payload: Record<string, unknown>,
) {
  const response = await fetch(
    `${apiUrl}/api/integrations/posthog/webhook?workspaceId=${encodeURIComponent(workspaceId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${webhookSecret}`,
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status} ${await response.text()}`);
  }
}

async function main() {
  loadEnvLocal();
  console.log("Sprint 29 PostHog integration sanity check\n");

  const apiUrl = process.env.API_URL ?? "http://localhost:3000";

  const ownerUserId = await ensureClerkUser(OWNER_EMAIL, "PostHogOwner");
  const ownerClient = client(await getConvexTokenForUser(ownerUserId));
  await completeOnboarding(ownerClient);
  await ownerClient.mutation(api.testSeed.seedTestWorkspace, {});
  const state = await ownerClient.query(api.workspaces.getState, {});
  const workspaceId = state.activeWorkspaceId;
  if (!workspaceId) {
    throw new Error("No active workspace");
  }

  const created = await ownerClient.mutation(api.integrations.posthog.createWebhookSecret, {
    workspaceId,
  });
  if (!created.rawSecret || !created.last4) {
    throw new Error("Failed to create PostHog webhook secret");
  }
  const webhookSecret = created.rawSecret;
  console.log("  [PASS] Owner created encrypted PostHog webhook secret");

  const status = await ownerClient.query(api.integrations.posthog.getPostHogStatus, {
    workspaceId,
  });
  if (!status.maskedSecret?.includes("••••")) {
    throw new Error("Masked secret not returned");
  }
  console.log("  [PASS] Secret is masked in status response");

  await postPostHogWebhook(apiUrl, workspaceId, webhookSecret, {
    event: "user signed up",
    distinct_id: "sanity_user_1",
    uuid: `posthog-sanity-signup-${Date.now()}`,
    timestamp: new Date().toISOString(),
    properties: {
      $email: "sanity@sortiri.dev",
      password: "super-secret-password",
      phone: "555-1234",
    },
  });
  console.log("  [PASS] Bearer webhook accepted");

  const events = await ownerClient.query(api.events.listByWorkspace, {
    workspaceId,
    limit: 20,
  });
  const posthogEvent = events.find((event) => event.source === "posthog");
  if (!posthogEvent) {
    throw new Error("PostHog event not found in timeline");
  }
  if (JSON.stringify(posthogEvent.data ?? {}).includes("super-secret-password")) {
    throw new Error("Unsafe PostHog properties were stored");
  }
  console.log("  [PASS] PostHog product event recorded safely in timeline");

  const entities = await ownerClient.query(api.entities.listByWorkspace, { workspaceId });
  const hasUser = entities.some((entity) => entity.type === "user");
  const hasPosthogSource = entities.some(
    (entity) => entity.type === "source" && entity.key === "posthog",
  );
  if (!hasUser || !hasPosthogSource) {
    throw new Error("Expected PostHog entities were not created");
  }
  console.log("  [PASS] User and source entities created");

  const health = await ownerClient.query(api.integrations.health.getSourceHealth, {
    workspaceId,
  });
  const posthogHealth = health.find((entry) => entry.source === "posthog");
  if (!posthogHealth || posthogHealth.status !== "connected") {
    throw new Error("PostHog source health is not connected");
  }
  console.log("  [PASS] Source health shows PostHog connected");

  const seededReport = await ownerClient.mutation(api.testSeed.seedAuditReportWithEvidence, {});
  await ownerClient.mutation(api.testSeed.seedPostHogProductEvent, {});
  const payload = await ownerClient.query(api.auditSharing.getExportPayloadForReport, {
    reportId: seededReport.reportId,
  });
  if (!payload) {
    throw new Error("Could not load audit export payload");
  }
  const json = exportJsonString({ ...payload, exportedAt: Date.now() });
  if (json.includes("super-secret-password") || json.includes("phone")) {
    throw new Error("Audit export leaked unsafe PostHog fields");
  }
  console.log("  [PASS] Audit export remains safe for PostHog evidence");

  if (!process.env.KEEP_WEBHOOK_SECRET) {
    await ownerClient.mutation(api.integrations.posthog.revokeWebhookSecret, { workspaceId });
    const revokedResponse = await fetch(
      `${apiUrl}/api/integrations/posthog/webhook?workspaceId=${encodeURIComponent(workspaceId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${webhookSecret}`,
        },
        body: JSON.stringify({
          event: "user signed up",
          distinct_id: "sanity_user_revoked",
          uuid: `posthog-sanity-revoked-${Date.now()}`,
        }),
      },
    );
    if (revokedResponse.status !== 401) {
      throw new Error("Revoked secret should reject webhook with 401");
    }
    console.log("  [PASS] Revoked secret rejects webhook");
  }

  console.log(`\nAll checks passed (workspace ${workspaceId}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
