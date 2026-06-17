import { loadCloudConfig as loadConfig } from "@sortiri/local";

export type ReliabilityCommandOptions = {
  subcommand?: string;
  deliveryId?: string;
  deadLetterId?: string;
  status?: string;
  source?: string;
  limit?: number;
  payload?: string;
};

export async function runReliability(
  options: ReliabilityCommandOptions,
): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Sortiri is not initialized");
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };

  const subcommand = options.subcommand ?? "deliveries";

  if (subcommand === "deliveries") {
    const params = new URLSearchParams({ workspaceId: config.workspaceId });
    if (options.status) params.set("status", options.status);
    if (options.source) params.set("source", options.source);
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    const response = await fetch(
      `${config.apiUrl}/cli/reliability?${params.toString()}`,
      { headers },
    );
    const payload = (await response.json().catch(() => null)) as
      | { deliveries?: unknown[]; error?: string }
      | null;
    if (!response.ok) {
      console.error(payload?.error ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload?.deliveries ?? [], null, 2));
    return;
  }

  if (subcommand === "dead-letters") {
    const params = new URLSearchParams({ workspaceId: config.workspaceId });
    if (options.status) params.set("status", options.status);
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    const response = await fetch(
      `${config.apiUrl}/cli/reliability/dead-letters?${params.toString()}`,
      { headers },
    );
    const payload = (await response.json().catch(() => null)) as
      | { deadLetters?: unknown[]; error?: string }
      | null;
    if (!response.ok) {
      console.error(payload?.error ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload?.deadLetters ?? [], null, 2));
    return;
  }

  if (subcommand === "replay") {
    if (!options.deliveryId && !options.deadLetterId) {
      console.error("--delivery or --dead-letter is required for replay");
      process.exit(1);
    }
    const body: Record<string, unknown> = { workspaceId: config.workspaceId };
    if (options.deliveryId) body.deliveryId = options.deliveryId;
    if (options.deadLetterId) body.deadLetterId = options.deadLetterId;
    if (options.payload) {
      try {
        body.payload = JSON.parse(options.payload);
      } catch {
        console.error("--payload must be valid JSON");
        process.exit(1);
      }
    }
    const response = await fetch(`${config.apiUrl}/cli/reliability/replay`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => null)) as
      | Record<string, unknown>
      | { error?: string }
      | null;
    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload
          ? payload.error
          : `Request failed with status ${response.status}`;
      console.error(message);
      process.exit(1);
    }
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (subcommand === "journal-list") {
    const params = new URLSearchParams({ workspaceId: config.workspaceId });
    if (options.source) params.set("source", options.source);
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    const response = await fetch(
      `${config.apiUrl}/cli/reliability/journal/list?${params.toString()}`,
      { headers },
    );
    const payload = (await response.json().catch(() => null)) as
      | { entries?: unknown[]; error?: string }
      | null;
    if (!response.ok) {
      console.error(payload?.error ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload?.entries ?? [], null, 2));
    return;
  }

  console.error(`Unknown reliability subcommand: ${subcommand}`);
  process.exit(1);
}
