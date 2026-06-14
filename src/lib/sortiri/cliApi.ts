import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { getIngestConvexClient } from "./ingestApi";

export type CliSetupConsumeBody = {
  setupToken: string;
  repo?: {
    name?: string;
    repositoryUrl?: string;
    localPath?: string;
    gitBranch?: string;
  };
  editor?: "cursor" | "claude_code" | "codex" | "other";
};

export type CliSetupConsumeResponse = {
  ok: true;
  apiUrl: string;
  apiKey: string;
  workspaceId: string;
  projectId: string | null;
  projectName: string;
};

export function getPublicApiUrl(req: Request): string {
  const fromEnv = process.env.SORTIRI_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const origin = req.headers.get("origin") || req.headers.get("x-forwarded-host");
  if (origin) {
    const proto = req.headers.get("x-forwarded-proto") ?? "http";
    if (origin.startsWith("http")) return origin.replace(/\/$/, "");
    return `${proto}://${origin}`.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export async function completeCliSetupViaConvex(body: CliSetupConsumeBody) {
  const convex: ConvexHttpClient = getIngestConvexClient();
  return convex.mutation(api.cliSetup.completeSetup, {
    rawToken: body.setupToken,
    repo: body.repo,
    editor: body.editor,
  });
}
