import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type TempProject = {
  root: string;
  cleanup: () => void;
};

export function createTempProject(options?: { git?: boolean }): TempProject {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sortiri-test-"));
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "sortiri-test-project", version: "1.0.0" }, null, 2),
  );

  if (options?.git !== false) {
    execSync("git init", { cwd: root, stdio: "ignore" });
    execSync('git config user.email "test@sortiri.local"', { cwd: root, stdio: "ignore" });
    execSync('git config user.name "Sortiri Test"', { cwd: root, stdio: "ignore" });
  }

  return {
    root,
    cleanup: () => {
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

export function runCli(
  repoRoot: string,
  args: string[],
  env?: Record<string, string>,
): { stdout: string; stderr: string; status: number } {
  const cliEntry = path.resolve("packages/cli/src/index.ts");
  try {
    const stdout = execSync(`npx tsx ${cliEntry} ${args.join(" ")}`, {
      cwd: repoRoot,
      env: { ...process.env, ...env },
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { stdout, stderr: "", status: 0 };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? "",
      status: err.status ?? 1,
    };
  }
}
