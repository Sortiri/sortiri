import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import chokidar, { type FSWatcher } from "chokidar";
import {
  isBinaryExtension,
  isSensitiveArtifactPath,
  loadSession,
  findRepoRoot,
  redactSensitiveContent,
  truncateArtifactContent,
} from "@sortiri/local";
import type { SortiriConfig } from "@sortiri/local";
import { IngestClient } from "./ingestClient.js";

const execFileAsync = promisify(execFile);

const DEBOUNCE_MS = 1250;

const WATCHED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".css",
  ".scss",
  ".md",
  ".mdx",
  ".json",
]);

const IGNORED_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  "dist",
  "build",
  "coverage",
  ".convex",
  ".sortiri",
]);

function getExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

function toRelativePath(repoRoot: string, absolutePath: string): string {
  return path.relative(repoRoot, absolutePath).split(path.sep).join("/");
}

function shouldIgnoreWatchPath(absolutePath: string, repoRoot: string): boolean {
  const relative = path.relative(repoRoot, absolutePath);
  if (relative.startsWith("..")) {
    return true;
  }
  if (!relative) {
    return false;
  }

  const parts = relative.split(path.sep);
  for (const part of parts) {
    if (IGNORED_DIR_NAMES.has(part)) {
      return true;
    }
  }

  const relativePath = toRelativePath(repoRoot, absolutePath);
  if (isSensitiveArtifactPath(relativePath)) {
    return true;
  }

  const baseName = path.basename(absolutePath);
  if (baseName.endsWith(".log")) {
    return true;
  }

  const ext = getExtension(absolutePath);
  if (!ext) {
    return false;
  }

  if (isBinaryExtension(ext)) {
    return true;
  }

  return !WATCHED_EXTENSIONS.has(ext);
}

function shouldIgnoreFileEvent(absolutePath: string, repoRoot: string): boolean {
  return shouldIgnoreWatchPath(absolutePath, repoRoot);
}

function titleForEvent(kind: WatcherEventKind, relativePath: string): string {
  switch (kind) {
    case "add":
      return `Created ${relativePath}`;
    case "unlink":
      return `Deleted ${relativePath}`;
    default:
      return `Changed ${relativePath}`;
  }
}

function summaryForEvent(kind: WatcherEventKind, relativePath: string): string {
  switch (kind) {
    case "add":
      return `Detected a new local file at ${relativePath}.`;
    case "unlink":
      return `Detected a deleted local file at ${relativePath}.`;
    default:
      return `Detected a local file change in ${relativePath}.`;
  }
}

function typeForEvent(kind: WatcherEventKind): string {
  switch (kind) {
    case "add":
      return "file.created";
    case "unlink":
      return "file.deleted";
    default:
      return "file.changed";
  }
}

type WatcherEventKind = "change" | "add" | "unlink";

async function getGitDiff(repoRoot: string, relativePath: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["diff", "--", relativePath],
      { cwd: repoRoot, maxBuffer: 1024 * 1024 },
    );
    const trimmed = stdout.trim();
    return trimmed || undefined;
  } catch {
    return undefined;
  }
}

async function createDiffArtifact(
  client: IngestClient,
  input: {
    relativePath: string;
    workstreamId?: string;
    projectId?: string | null;
  },
): Promise<{ artifactId: string; truncated: boolean } | null> {
  const repoRoot = findRepoRoot();
  const rawDiff = await getGitDiff(repoRoot, input.relativePath);
  if (!rawDiff) {
    return null;
  }

  const redacted = redactSensitiveContent(rawDiff).redacted;
  const { content, truncated } = truncateArtifactContent(redacted);

  const artifact = await client.createArtifact({
    workstreamId: input.workstreamId,
    projectId: input.projectId,
    type: "diff",
    title: `Diff for ${input.relativePath}`,
    summary: `Git diff captured for ${input.relativePath}.`,
    content,
    filePath: input.relativePath,
    language: "diff",
    truncated,
    sizeBytes: content.length,
    emitEvent: false,
    metadata: {
      path: input.relativePath,
      event: "change",
    },
  });

  if (!artifact?.artifactId) {
    return null;
  }

  return { artifactId: artifact.artifactId, truncated };
}

export function startWatcher(config: SortiriConfig): FSWatcher {
  const repoRoot = findRepoRoot();
  const client = new IngestClient(config);
  const debounceTimers = new Map<string, NodeJS.Timeout>();

  const watcher = chokidar.watch(repoRoot, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
    ignored: (watchPath) => shouldIgnoreWatchPath(watchPath, repoRoot),
  });

  const scheduleEvent = (absolutePath: string, kind: WatcherEventKind) => {
    if (shouldIgnoreFileEvent(absolutePath, repoRoot)) {
      return;
    }

    const key = `${kind}:${absolutePath}`;
    const existing = debounceTimers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    debounceTimers.set(
      key,
      setTimeout(() => {
        debounceTimers.delete(key);
        void (async () => {
          const relativePath = toRelativePath(repoRoot, absolutePath);
          const session = loadSession(repoRoot);
          const extension = getExtension(absolutePath);
          const data: Record<string, unknown> = {
            path: relativePath,
            extension,
            event: kind,
          };

          let artifactIds: string[] | undefined;
          let truncated = false;

          if (kind === "change" && !isSensitiveArtifactPath(relativePath)) {
            const diffArtifact = await createDiffArtifact(client, {
              relativePath,
              workstreamId: session.currentWorkstreamId ?? undefined,
              projectId: config.projectId,
            });

            if (diffArtifact) {
              artifactIds = [diffArtifact.artifactId];
              truncated = diffArtifact.truncated;
              data.hasDiff = true;
              data.truncated = truncated;
            }
          }

          await client.recordEvent({
            projectId: config.projectId,
            workstreamId: session.currentWorkstreamId ?? undefined,
            source: "watcher",
            category: "code_change",
            type: typeForEvent(kind),
            actor: {
              type: "system",
              name: "Sortiri Watcher",
            },
            title: titleForEvent(kind, relativePath),
            summary: summaryForEvent(kind, relativePath),
            entity: {
              type: "file",
              name: relativePath,
            },
            artifactIds,
            data,
          });
        })();
      }, DEBOUNCE_MS),
    );
  };

  watcher.on("change", (filePath) => scheduleEvent(filePath, "change"));
  watcher.on("add", (filePath) => scheduleEvent(filePath, "add"));
  watcher.on("unlink", (filePath) => scheduleEvent(filePath, "unlink"));

  watcher.on("error", (error) => {
    console.error(`Sortiri watcher error: ${error instanceof Error ? error.message : String(error)}`);
  });

  return watcher;
}
