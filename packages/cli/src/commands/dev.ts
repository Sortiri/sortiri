import { isCloudMode, isLocalMode, loadConfig, loadSession, findRepoRoot } from "@sortiri/local";
import { startLocalViewer } from "../localViewer.js";
import { startWatcher } from "../watcher.js";

export type DevOptions = {
  smoke?: boolean;
  watch?: boolean;
  port?: number;
  host?: string;
};

export async function runDev(options: DevOptions = {}): Promise<void> {
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

  if (isLocalMode(config) && !options.watch) {
    const host = options.host ?? "127.0.0.1";
    const port = options.port ?? 4317;
    const server = await startLocalViewer({ host, port, smoke: options.smoke });

    if (options.smoke) {
      console.log(`Local timeline viewer smoke check passed on ${host}:${port}`);
      return;
    }

    console.log("Sortiri local timeline viewer\n");
    console.log(`Open http://${host}:${port}`);
    console.log(`Events: .sortiri/events.jsonl`);
    console.log(
      `Workstream: ${session.currentWorkstreamId ?? "none"}${
        session.currentWorkstreamTitle ? ` (${session.currentWorkstreamTitle})` : ""
      }`,
    );
    console.log("\nPress Ctrl+C to stop.\n");

    await new Promise<void>(() => {
      // keep alive
    });
    server.close();
    return;
  }

  if (isCloudMode(config)) {
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
}
