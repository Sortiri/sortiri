/**
 * Sprint 27 Stripe revenue integration sanity check.
 *
 * Usage: npx tsx scripts/sanity-stripe-integration.ts
 */

import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { exportJsonString } from "../src/lib/audits/exportJson";
import { buildStripeSignatureHeader } from "../src/lib/integrations/stripe/verifySignature";
import { TEST_STRIPE_WEBHOOK_SECRET } from "../convex/testSeed";

const PASSWORD = "SortiriSanity!stripe-integration-2026";
const OWNER_EMAIL = "sortiri-sanity-stripe-owner@agentmail.to";

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
        companyName: "Stripe Revenue Co",
        companyType: "SaaS",
        trackTypes: ["Revenue"],
        tools: ["Stripe"],
        exampleQuestion: "What revenue events happened recently?",
        currentStep: 5,
      },
    });
    await c.mutation(api.onboarding.complete, {});
  }
}

async function postStripeWebhook(
  apiUrl: string,
  workspaceId: string,
  eventType: string,
) {
  const eventId = `evt_sanity_${eventType.replace(/\./g, "_")}_${Date.now()}`;
  const payload = {
    id: eventId,
    object: "event",
    type: eventType,
    livemode: false,
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: "pi_sanity_sortiri",
        object: "payment_intent",
        amount: 5000,
        currency: "usd",
        customer: "cus_sanity_sortiri",
        receipt_email: "sanity@sortiri.dev",
        latest_charge: "ch_sanity_sortiri",
      },
    },
  };
  const rawBody = JSON.stringify(payload);
  const signature = buildStripeSignatureHeader(rawBody, TEST_STRIPE_WEBHOOK_SECRET);
  const response = await fetch(
    `${apiUrl}/api/integrations/stripe/webhook?workspaceId=${encodeURIComponent(workspaceId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": signature,
      },
      body: rawBody,
    },
  );
  if (!response.ok) {
    throw new Error(`Webhook ${eventType} failed: ${response.status} ${await response.text()}`);
  }
}

async function main() {
  loadEnvLocal();
  console.log("Sprint 27 Stripe integration sanity check\n");

  const apiUrl = process.env.API_URL ?? "http://localhost:3000";

  const ownerUserId = await ensureClerkUser(OWNER_EMAIL, "StripeOwner");
  const ownerClient = client(await getConvexTokenForUser(ownerUserId));
  await completeOnboarding(ownerClient);
  await ownerClient.mutation(api.testSeed.seedTestWorkspace, {});
  const state = await ownerClient.query(api.workspaces.getState, {});
  const workspaceId = state.activeWorkspaceId;
  if (!workspaceId) {
    throw new Error("No active workspace");
  }

  const saved = await ownerClient.mutation(api.integrations.stripe.saveWebhookSecret, {
    workspaceId,
    rawSecret: TEST_STRIPE_WEBHOOK_SECRET,
  });
  if (!saved.ok || !saved.last4) {
    throw new Error("Failed to save Stripe webhook secret");
  }
  console.log("  [PASS] Owner saved encrypted Stripe webhook secret");

  const status = await ownerClient.query(api.integrations.stripe.getStripeStatus, {
    workspaceId,
  });
  if (!status.maskedSecret?.includes("••••")) {
    throw new Error("Masked secret not returned");
  }
  console.log("  [PASS] Secret is masked in status response");

  await postStripeWebhook(apiUrl, workspaceId, "payment_intent.succeeded");
  console.log("  [PASS] Signed webhook accepted");

  const events = await ownerClient.query(api.events.listByWorkspace, {
    workspaceId,
    limit: 20,
  });
  const stripeEvent = events.find((event) => event.source === "stripe");
  if (!stripeEvent) {
    throw new Error("Stripe event not found in timeline");
  }
  console.log("  [PASS] Stripe revenue event recorded in timeline");

  const entities = await ownerClient.query(api.entities.listByWorkspace, { workspaceId });
  const hasCustomer = entities.some((entity) => entity.type === "customer");
  const hasPayment = entities.some((entity) => entity.type === "payment");
  const hasStripeSource = entities.some(
    (entity) => entity.type === "source" && entity.key === "stripe",
  );
  if (!hasCustomer || !hasPayment || !hasStripeSource) {
    throw new Error("Expected Stripe entities were not created");
  }
  console.log("  [PASS] Customer/payment/source entities created");

  const seededReport = await ownerClient.mutation(api.testSeed.seedAuditReportWithEvidence, {});
  await ownerClient.mutation(api.testSeed.seedStripeRevenueEvent, {});
  const payload = await ownerClient.query(api.auditSharing.getExportPayloadForReport, {
    reportId: seededReport.reportId,
  });
  if (!payload) {
    throw new Error("Could not load audit export payload");
  }
  const json = exportJsonString({ ...payload, exportedAt: Date.now() });
  if (json.includes("billing_address")) {
    throw new Error("Audit export leaked raw Stripe billing fields");
  }
  console.log("  [PASS] Audit export remains safe for Stripe evidence");

  if (!process.env.KEEP_WEBHOOK_SECRET) {
    await ownerClient.mutation(api.integrations.stripe.revokeWebhookSecret, { workspaceId });
    const revokedResponse = await fetch(
      `${apiUrl}/api/integrations/stripe/webhook?workspaceId=${encodeURIComponent(workspaceId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Stripe-Signature": buildStripeSignatureHeader("{}", TEST_STRIPE_WEBHOOK_SECRET),
        },
        body: "{}",
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
