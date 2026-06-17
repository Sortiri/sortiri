/**
 * Local GitHub webhook tester — POST a signed pull_request payload without ngrok.
 *
 * Usage:
 *   WORKSPACE_ID=<uuid> WEBHOOK_SECRET=whsec_sortiri_... npm run test:github-webhook
 *
 * Optional:
 *   API_URL=http://localhost:3000
 *   DELIVERY_ID=test-delivery-id
 */

import { createHmac } from "node:crypto";

async function main() {
  const apiUrl = process.env.API_URL ?? "http://localhost:3000";
  const workspaceId = process.env.WORKSPACE_ID;
  const webhookSecret = process.env.WEBHOOK_SECRET;
  const deliveryId = process.env.DELIVERY_ID ?? `test-delivery-${Date.now()}`;

  if (!workspaceId) {
    throw new Error("Set WORKSPACE_ID to your workspace external ID");
  }

  if (!webhookSecret) {
    throw new Error("Set WEBHOOK_SECRET to your active GitHub webhook secret");
  }

  const payload = {
    action: "opened",
    number: 42,
    sender: {
      id: 12345,
      login: "octocat",
    },
    repository: {
      full_name: "sortiri/example-repo",
      html_url: "https://github.com/sortiri/example-repo",
    },
    pull_request: {
      id: 987654,
      number: 42,
      title: "Update homepage copy",
      body: "Small copy tweak for the homepage hero.",
      state: "open",
      merged: false,
      html_url: "https://github.com/sortiri/example-repo/pull/42",
      head: { ref: "feature/homepage-copy" },
      base: { ref: "main" },
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature =
    "sha256=" + createHmac("sha256", webhookSecret).update(rawBody, "utf8").digest("hex");

  const response = await fetch(
    `${apiUrl}/webhooks/github?workspaceId=${encodeURIComponent(workspaceId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-event": "pull_request",
        "x-github-delivery": deliveryId,
        "x-hub-signature-256": signature,
      },
      body: rawBody,
    },
  );

  const text = await response.text();
  console.log(`Status: ${response.status}`);
  console.log(text);

  if (!response.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
