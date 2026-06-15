import { loadConfig } from "@sortiri/local";

export type RecommendationsCommandOptions = {
  subcommand?: string;
  id?: string;
  limit?: number;
};

export async function runRecommendations(
  options: RecommendationsCommandOptions,
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

  const subcommand = options.subcommand ?? "list";

  if (subcommand === "list") {
    const params = new URLSearchParams({ workspaceId: config.workspaceId });
    if (options.limit !== undefined) {
      params.set("limit", String(options.limit));
    }
    const response = await fetch(`${config.apiUrl}/api/cli/recommendations?${params.toString()}`, {
      headers,
    });
    const payload = (await response.json().catch(() => null)) as
      | { recommendations?: unknown[]; error?: string }
      | null;
    if (!response.ok) {
      console.error(payload?.error ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload?.recommendations ?? [], null, 2));
    return;
  }

  if (subcommand === "generate") {
    const response = await fetch(`${config.apiUrl}/api/cli/recommendations/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ workspaceId: config.workspaceId }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { count?: number; createdIds?: string[]; error?: string }
      | null;
    if (!response.ok) {
      console.error(payload?.error ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (subcommand === "get") {
    if (!options.id) {
      console.error("recommendation id is required for get");
      process.exit(1);
    }
    const params = new URLSearchParams({ workspaceId: config.workspaceId });
    const response = await fetch(
      `${config.apiUrl}/api/cli/recommendations/${options.id}?${params.toString()}`,
      { headers },
    );
    const payload = (await response.json().catch(() => null)) as
      | { recommendation?: unknown; error?: string }
      | null;
    if (!response.ok) {
      console.error(payload?.error ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload?.recommendation ?? null, null, 2));
    return;
  }

  if (subcommand === "convert") {
    if (!options.id) {
      console.error("recommendation id is required for convert");
      process.exit(1);
    }
    const response = await fetch(
      `${config.apiUrl}/api/cli/recommendations/${options.id}/convert`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ workspaceId: config.workspaceId }),
      },
    );
    const payload = (await response.json().catch(() => null)) as
      | { workstreamId?: string; contextPackId?: string; error?: string }
      | null;
    if (!response.ok) {
      console.error(payload?.error ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.error(`Unknown recommendations subcommand: ${subcommand}`);
  process.exit(1);
}
