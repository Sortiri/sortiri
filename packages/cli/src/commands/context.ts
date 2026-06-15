import { loadConfig } from "@sortiri/local";

export type ContextCommandOptions = {
  goal?: string;
  title?: string;
  file?: string[];
  project?: string;
  workstream?: string;
  entity?: string;
  timeWindowDays?: number;
  packId?: string;
};

export async function runContext(options: ContextCommandOptions): Promise<void> {
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

  if (options.packId) {
    const params = new URLSearchParams({ workspaceId: config.workspaceId });
    const response = await fetch(
      `${config.apiUrl}/api/cli/context/packs/${options.packId}?${params.toString()}`,
      { headers },
    );
    const payload = (await response.json().catch(() => null)) as
      | { text?: string; error?: string }
      | null;
    if (!response.ok) {
      console.error(payload?.error ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(payload?.text ?? "");
    return;
  }

  if (!options.goal?.trim()) {
    console.error("--goal is required (or use --pack-id to fetch an existing pack)");
    process.exit(1);
  }

  const response = await fetch(`${config.apiUrl}/api/cli/context/packs`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      workspaceId: config.workspaceId,
      goal: options.goal,
      title: options.title,
      projectId: options.project ?? config.projectId ?? undefined,
      workstreamId: options.workstream,
      entityId: options.entity,
      files: options.file,
      timeWindowDays: options.timeWindowDays,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { text?: string; contextPackId?: string; error?: string }
    | null;

  if (!response.ok) {
    console.error(payload?.error ?? `Request failed with status ${response.status}`);
    process.exit(1);
  }

  if (payload?.text) {
    console.log(payload.text);
  }
  if (payload?.contextPackId) {
    console.error(`\nContext pack ID: ${payload.contextPackId}`);
  }
}
