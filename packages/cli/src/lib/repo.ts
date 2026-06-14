import { execSync } from "node:child_process";
import path from "node:path";

export type RepoInfo = {
  repoRoot: string;
  name: string;
  repositoryUrl?: string;
  localPath: string;
  gitBranch?: string;
};

function runGit(cwd: string, args: string[]): string | null {
  try {
    return execSync(`git ${args.join(" ")}`, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

export function detectRepoInfo(cwd: string): RepoInfo {
  const repoRoot = runGit(cwd, ["rev-parse", "--show-toplevel"]) ?? cwd;
  const repositoryUrl =
    runGit(repoRoot, ["remote", "get-url", "origin"]) ?? undefined;
  const gitBranch =
    runGit(repoRoot, ["branch", "--show-current"]) ?? undefined;
  const folderName = path.basename(repoRoot);
  const name = folderName || "project";

  return {
    repoRoot,
    name,
    repositoryUrl,
    localPath: repoRoot,
    gitBranch,
  };
}
