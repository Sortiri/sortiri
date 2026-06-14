import fs from "node:fs";
import path from "node:path";

const SORTIRI_DIR_NAME = ".sortiri";
const CONFIG_FILE_NAME = "config.json";
const SESSION_FILE_NAME = "session.json";

export function findRepoRoot(startDir: string = process.cwd()): string {
  let current = path.resolve(startDir);

  while (true) {
    const hasGit = fs.existsSync(path.join(current, ".git"));
    const hasPackageJson = fs.existsSync(path.join(current, "package.json"));
    if (hasGit || hasPackageJson) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }
    current = parent;
  }
}

export function resolveConfigPath(cwd?: string): string {
  const envPath = process.env.SORTIRI_CONFIG_PATH?.trim();
  if (envPath) {
    return path.isAbsolute(envPath)
      ? envPath
      : path.resolve(findRepoRoot(cwd), envPath);
  }
  return path.join(getSortiriDir(cwd), CONFIG_FILE_NAME);
}

export function getSortiriDir(cwd?: string): string {
  return path.join(findRepoRoot(cwd), SORTIRI_DIR_NAME);
}

export function getConfigPath(cwd?: string): string {
  return resolveConfigPath(cwd);
}

export function getSessionPath(cwd?: string): string {
  const configPath = resolveConfigPath(cwd);
  return path.join(path.dirname(configPath), SESSION_FILE_NAME);
}
