import { createHmac } from "node:crypto";
import { loadCloudConfig as loadConfig } from "@sortiri/local";

export type IncidentsCommandOptions = {
  subcommand?: string;
  id?: string;
  title?: string;
  summary?: string;
  severity?: string;
  status?: string;
  workstreamId?: string;
  decisionId?: string;
  service?: string;
  environment?: string;
  rootCause?: string;
  mitigation?: string;
  rollbackSummary?: string;
  reason?: string;
  limit?: number;
};

function buildHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export async function runIncidents(options: IncidentsCommandOptions): Promise<void> {
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
    const response = await fetch(`${config.apiUrl}/cli/incidents`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspaceId: config.workspaceId,
        title: options.title,
        summary: options.summary,
        severity: options.severity ?? "error",
        workstreamId: options.workstreamId,
        service: options.service,
        environment: options.environment,
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
    if (options.status) params.set("status", options.status);
    if (options.severity) params.set("severity", options.severity);
    const response = await fetch(`${config.apiUrl}/cli/incidents?${params.toString()}`, {
      headers,
    });
    const payload = (await response.json().catch(() => null)) as
      | { incidents?: unknown[]; error?: string }
      | null;
    if (!response.ok) {
      console.error(payload?.error ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload?.incidents ?? [], null, 2));
    return;
  }

  if (subcommand === "get") {
    if (!options.id) {
      console.error("incident id is required for get");
      process.exit(1);
    }
    const params = new URLSearchParams({ workspaceId: config.workspaceId });
    const response = await fetch(
      `${config.apiUrl}/cli/incidents/${options.id}?${params.toString()}`,
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

  if (subcommand === "resolve") {
    if (!options.id) {
      console.error("incident id is required for resolve");
      process.exit(1);
    }
    const response = await fetch(`${config.apiUrl}/cli/incidents/${options.id}/resolve`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspaceId: config.workspaceId,
        rootCause: options.rootCause,
        mitigation: options.mitigation,
        rollbackSummary: options.rollbackSummary,
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

  if (subcommand === "rollback") {
    if (!options.id) {
      console.error("incident id is required for rollback");
      process.exit(1);
    }
    if (!options.title) {
      console.error("--title is required for rollback");
      process.exit(1);
    }
    const response = await fetch(`${config.apiUrl}/cli/incidents/${options.id}/rollback`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspaceId: config.workspaceId,
        title: options.title,
        summary: options.summary,
        reason: options.reason,
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

  console.error(`Unknown incidents subcommand: ${subcommand}`);
  process.exit(1);
}

function buildObservabilitySignature(rawBody: string, signingSecret: string, timestamp: number) {
  const basestring = `v0:${timestamp}:${rawBody}`;
  const digest = createHmac("sha256", signingSecret).update(basestring).digest("hex");
  return `v0=${digest}`;
}

export async function runObservabilityTestWebhook(signingSecret?: string): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Sortiri is not initialized");
    process.exit(1);
  }

  const secret = signingSecret ?? process.env.SORTIRI_OBSERVABILITY_SIGNING_SECRET;
  if (!secret) {
    console.error("Set SORTIRI_OBSERVABILITY_SIGNING_SECRET or pass --secret");
    process.exit(1);
  }

  const body = JSON.stringify({
    source: "cli",
    signalType: "deploy_failed",
    title: "CLI test: production deploy failed",
    severity: "error",
    service: "api",
    environment: "production",
    event_id: `cli-test-${Date.now()}`,
  });

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = buildObservabilitySignature(body, secret, timestamp);
  const url = `${config.apiUrl}/webhooks/observability?workspaceId=${encodeURIComponent(config.workspaceId)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-sortiri-request-timestamp": String(timestamp),
      "x-sortiri-signature": signature,
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
