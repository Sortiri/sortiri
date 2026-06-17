import { createHmac } from "node:crypto";
import { loadCloudConfig as loadConfig } from "@sortiri/local";

export type DecisionsCommandOptions = {
  subcommand?: string;
  id?: string;
  title?: string;
  rationale?: string;
  workstreamId?: string;
  decisionId?: string;
  limit?: number;
};

function buildHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export async function runDecisions(options: DecisionsCommandOptions): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Sortiri is not initialized");
    process.exit(1);
  }

  const headers = buildHeaders(config.apiKey);
  const subcommand = options.subcommand ?? "list";

  if (subcommand === "record") {
    if (!options.title) {
      console.error("--title is required for record");
      process.exit(1);
    }
    const response = await fetch(`${config.apiUrl}/cli/decisions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspaceId: config.workspaceId,
        title: options.title,
        rationale: options.rationale,
        workstreamId: options.workstreamId,
        decisionType: "engineering",
      }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      console.error(payload?.error ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (subcommand === "list") {
    const params = new URLSearchParams({ workspaceId: config.workspaceId });
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    const response = await fetch(`${config.apiUrl}/cli/decisions?${params.toString()}`, {
      headers,
    });
    const payload = (await response.json().catch(() => null)) as
      | { decisions?: unknown[]; error?: string }
      | null;
    if (!response.ok) {
      console.error(payload?.error ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload?.decisions ?? [], null, 2));
    return;
  }

  if (subcommand === "get") {
    if (!options.id) {
      console.error("decision id is required for get");
      process.exit(1);
    }
    const params = new URLSearchParams({ workspaceId: config.workspaceId });
    const response = await fetch(
      `${config.apiUrl}/cli/decisions/${options.id}?${params.toString()}`,
      { headers },
    );
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      console.error(payload?.error ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (subcommand === "link") {
    if (!options.decisionId || !options.workstreamId) {
      console.error("--decision and --workstream are required for link");
      process.exit(1);
    }
    const response = await fetch(
      `${config.apiUrl}/cli/decisions/${options.decisionId}/link`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          workspaceId: config.workspaceId,
          workstreamId: options.workstreamId,
        }),
      },
    );
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      console.error(payload?.error ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (subcommand === "rollback") {
    if (!options.title) {
      console.error("--title is required for rollback");
      process.exit(1);
    }
    const path = options.decisionId
      ? `${config.apiUrl}/cli/decisions/${options.decisionId}/rollback`
      : `${config.apiUrl}/cli/decisions/rollback`;
    const response = await fetch(path, {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspaceId: config.workspaceId,
        title: options.title,
        decisionId: options.decisionId,
      }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      console.error(payload?.error ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.error(`Unknown decisions subcommand: ${subcommand}`);
  process.exit(1);
}

function buildSlackSignature(rawBody: string, signingSecret: string, timestamp: number) {
  const basestring = `v0:${timestamp}:${rawBody}`;
  const digest = createHmac("sha256", signingSecret).update(basestring).digest("hex");
  return `v0=${digest}`;
}

export async function runSlackTestWebhook(signingSecret?: string): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Sortiri is not initialized");
    process.exit(1);
  }

  const secret = signingSecret ?? process.env.SORTIRI_SLACK_SIGNING_SECRET;
  if (!secret) {
    console.error("Set SORTIRI_SLACK_SIGNING_SECRET or pass --secret");
    process.exit(1);
  }

  const body = JSON.stringify({
    type: "event_callback",
    event_id: `cli-test-${Date.now()}`,
    event: {
      type: "app_mention",
      text: "decision: use Convex HTTP actions for all backend ingest",
      user: "U_TEST",
      channel: "C_TEST",
      ts: String(Date.now() / 1000),
    },
  });

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = buildSlackSignature(body, secret, timestamp);
  const url = `${config.apiUrl}/webhooks/slack?workspaceId=${encodeURIComponent(config.workspaceId)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Slack-Request-Timestamp": String(timestamp),
      "X-Slack-Signature": signature,
    },
    body,
  });

  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    console.error(payload?.error ?? `Request failed with status ${response.status}`);
    process.exit(1);
  }
  console.log(JSON.stringify(payload, null, 2));
}
