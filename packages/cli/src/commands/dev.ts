import { loadConfig, loadSession, findRepoRoot } from "@sortiri/local";
import { startWatcher } from "../watcher.js";

export async function runDev(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }

  const repoRoot = findRepoRoot();
  const session = loadSession(repoRoot);

  console.log("Sortiri watcher running\n");
  console.log(`Workspace: ${config.workspaceId}`);
  console.log(`Project: ${config.projectId ?? "none"}`);
  console.log(
    `Current workstream: ${session.currentWorkstreamId ?? "none"}${
      session.currentWorkstreamTitle ? ` (${session.currentWorkstreamTitle})` : ""
    }`,
  );
  console.log("\nWatching repo for changes...\n");

  startWatcher(config);

  await new Promise<void>(() => {
    // Keep process alive while watching.
  });
}
