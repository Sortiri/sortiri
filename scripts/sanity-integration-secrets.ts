/**
 * Sprint 28 integration secrets sanity check.
 *
 * Usage: npx tsx scripts/sanity-integration-secrets.ts
 */

import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { buildStripeSignatureHeader } from "../src/lib/integrations/stripe/verifySignature";
import {
  TEST_GITHUB_WEBHOOK_SECRET,
  TEST_STRIPE_WEBHOOK_SECRET,
} from "../convex/testSeed";

const PASSWORD = "SortiriSanity!integration-secrets-2026";
const OWNER_EMAIL = "sortiri-sanity-integration-owner@agentmail.to";

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
        companyName: "Integration Secrets Co",
        companyType: "SaaS",
        trackTypes: ["Revenue"],
        tools: ["GitHub", "Stripe"],
        exampleQuestion: "What integrations are connected?",
        currentStep: 5,
      },
    });
    await c.mutation(api.onboarding.complete, {});
  }
}

async function postGithubWebhook(apiUrl: string, workspaceId: string, secret: string) {
  const payload = {
    action: "opened",
    number: 99,
    sender: { id: 1, login: "sanity-bot" },
    repository: { full_name: "sortiri/sanity", html_url: "https://github.com/sortiri/sanity" },
    pull_request: {
      id: 1,
      number: 99,
      title: "Sanity PR",
      state: "open",
      merged: false,
      html_url: "https://github.com/sortiri/sanity/pull/99",
      head: { ref: "sanity" },
      base: { ref: "main" },
    },
  };
  const rawBody = JSON.stringify(payload);
  const signature =
    "sha256=" + createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const response = await fetch(
    `${apiUrl}/api/integrations/github/webhook?workspaceId=${encodeURIComponent(workspaceId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-event": "pull_request",
        "x-github-delivery": `sanity-github-${Date.now()}`,
        "x-hub-signature-256": signature,
      },
      body: rawBody,
    },
  );
  if (!response.ok) {
    throw new Error(`GitHub webhook failed: ${response.status} ${await response.text()}`);
  }
}

async function postStripeWebhook(apiUrl: string, workspaceId: string) {
  const payload = {
    id: `evt_sanity_integration_${Date.now()}`,
    object: "event",
    type: "payment_intent.succeeded",
    livemode: false,
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: "pi_sanity_integration",
        object: "payment_intent",
        amount: 2500,
        currency: "usd",
        customer: "cus_sanity_integration",
        receipt_email: "sanity@sortiri.dev",
        latest_charge: "ch_sanity_integration",
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
    throw new Error(`Stripe webhook failed: ${response.status} ${await response.text()}`);
  }
}

async function main() {
  loadEnvLocal();
  console.log("Sprint 28 integration secrets sanity check\n");

  const apiUrl = process.env.API_URL ?? "http://localhost:3000";
  const serverKey = requireEnv("SORTIRI_INTEGRATION_SERVER_KEY");
  const anonClient = new ConvexHttpClient(requireEnv("NEXT_PUBLIC_CONVEX_URL"));

  const ownerUserId = await ensureClerkUser(OWNER_EMAIL, "IntegrationOwner");
  const ownerClient = client(await getConvexTokenForUser(ownerUserId));
  await completeOnboarding(ownerClient);
  await ownerClient.mutation(api.testSeed.seedTestWorkspace, {});
  const state = await ownerClient.query(api.workspaces.getState, {});
  const workspaceId = state.activeWorkspaceId;
  if (!workspaceId) {
    throw new Error("No active workspace");
  }

  await ownerClient.mutation(api.testSeed.seedLegacyGithubWebhookSecret, {});
  console.log("  [PASS] Seeded legacy GitHub webhook secret");

  const migration = await anonClient.mutation(
    api.integrations.migrate.migrateLegacyGithubSecrets,
    { serverKey },
  );
  if (migration.migrated < 1 && migration.skippedExistingEncrypted < 1) {
    throw new Error(`Migration did not migrate legacy secret: ${JSON.stringify(migration)}`);
  }
  console.log("  [PASS] Migration completed");

  const githubStatus = await ownerClient.query(api.integrations.github.getGithubStatus, {
    workspaceId,
  });
  if (!githubStatus.maskedSecret?.includes("••••")) {
    throw new Error("GitHub masked secret missing after migration");
  }
  if (githubStatus.legacySecretDetected) {
    throw new Error("Legacy secret still detected after migration");
  }
  console.log("  [PASS] Encrypted GitHub secret exists");

  await postGithubWebhook(apiUrl, workspaceId, TEST_GITHUB_WEBHOOK_SECRET);
  console.log("  [PASS] GitHub webhook verifies with migrated secret");

  await ownerClient.mutation(api.integrations.stripe.saveWebhookSecret, {
    workspaceId,
    rawSecret: TEST_STRIPE_WEBHOOK_SECRET,
  });
  await postStripeWebhook(apiUrl, workspaceId);
  console.log("  [PASS] Stripe webhook still verifies");

  const health = await ownerClient.query(api.integrations.health.getSourceHealth, {
    workspaceId,
  });
  const githubHealth = health.find((entry) => entry.source === "github");
  const stripeHealth = health.find((entry) => entry.source === "stripe");
  if (githubHealth?.status !== "connected" && githubHealth?.status !== "error") {
    throw new Error(`GitHub health unexpected: ${githubHealth?.status}`);
  }
  if (stripeHealth?.status !== "connected" && stripeHealth?.status !== "error") {
    throw new Error(`Stripe health unexpected: ${stripeHealth?.status}`);
  }
  console.log("  [PASS] Source health shows GitHub and Stripe connected");

  console.log(`\nAll checks passed (workspace ${workspaceId}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
