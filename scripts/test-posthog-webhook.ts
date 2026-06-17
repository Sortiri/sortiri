/**
 * Local PostHog webhook tester — POST Bearer-authenticated payloads.
 *
 * Usage:
 *   WORKSPACE_ID=<uuid> WEBHOOK_SECRET=phsec_sortiri_... npx tsx scripts/test-posthog-webhook.ts
 *
 * Optional:
 *   API_URL=http://localhost:3000
 */

const SAMPLE_EVENTS = [
  {
    event: "user signed up",
    distinct_id: "user_test_1",
    uuid: "posthog-test-signup-1",
    timestamp: new Date().toISOString(),
    properties: { $email: "signup@sortiri.dev", plan: "pro" },
  },
  {
    event: "onboarding completed",
    distinct_id: "user_test_1",
    uuid: "posthog-test-activation-1",
    timestamp: new Date().toISOString(),
    properties: { $email: "signup@sortiri.dev" },
  },
  {
    event: "feature used",
    distinct_id: "user_test_2",
    uuid: "posthog-test-feature-1",
    timestamp: new Date().toISOString(),
    properties: { feature: "timeline", $pathname: "/timeline" },
  },
  {
    event: "checkout clicked",
    distinct_id: "user_test_3",
    uuid: "posthog-test-checkout-1",
    timestamp: new Date().toISOString(),
    properties: { $pathname: "/pricing" },
  },
  {
    event: "trial started",
    distinct_id: "user_test_4",
    uuid: "posthog-test-trial-1",
    timestamp: new Date().toISOString(),
    properties: { plan: "trial" },
  },
  {
    event: "invite sent",
    distinct_id: "user_test_5",
    uuid: "posthog-test-invite-1",
    timestamp: new Date().toISOString(),
    properties: { feature: "invite" },
  },
] as const;

async function postEvent(
  apiUrl: string,
  workspaceId: string,
  webhookSecret: string,
  payload: Record<string, unknown>,
  label: string,
) {
  const response = await fetch(
    `${apiUrl}/webhooks/posthog?workspaceId=${encodeURIComponent(workspaceId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${webhookSecret}`,
      },
      body: JSON.stringify(payload),
    },
  );

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}): ${body}`);
  }

  console.log(`[PASS] ${label} → ${body}`);
  return body;
}

async function main() {
  const apiUrl = process.env.API_URL ?? "http://localhost:3000";
  const workspaceId = process.env.WORKSPACE_ID;
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!workspaceId) {
    throw new Error("Set WORKSPACE_ID to your workspace external ID");
  }
  if (!webhookSecret) {
    throw new Error("Set WEBHOOK_SECRET to your active PostHog webhook secret");
  }

  for (const event of SAMPLE_EVENTS) {
    await postEvent(apiUrl, workspaceId, webhookSecret, event, event.event);
  }

  const duplicatePayload = { ...SAMPLE_EVENTS[0] };
  const duplicateBody = await postEvent(
    apiUrl,
    workspaceId,
    webhookSecret,
    duplicatePayload,
    "duplicate delivery",
  );
  if (!duplicateBody.includes("duplicate")) {
    console.warn("[WARN] duplicate delivery did not report duplicate:true");
  }

  const invalidResponse = await fetch(
    `${apiUrl}/webhooks/posthog?workspaceId=${encodeURIComponent(workspaceId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid_secret_value",
      },
      body: JSON.stringify(SAMPLE_EVENTS[0]),
    },
  );
  if (invalidResponse.status !== 401) {
    throw new Error(`Expected 401 for invalid secret, got ${invalidResponse.status}`);
  }
  console.log("[PASS] invalid secret → 401");

  console.log(`\nAll PostHog webhook tests passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
