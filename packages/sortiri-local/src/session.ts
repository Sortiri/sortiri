import fs from "node:fs";
import path from "node:path";
import { getSessionPath } from "./paths.js";
import { getSortiriDir } from "./paths.js";
import {
  EMPTY_SESSION,
  sortiriSessionSchema,
  type SortiriSession,
} from "./types.js";

function writeSessionFile(sessionPath: string, session: SortiriSession): void {
  fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
  const tmpPath = `${sessionPath}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(session, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, sessionPath);
}

export function loadSession(cwd?: string): SortiriSession {
  const sessionPath = getSessionPath(cwd);
  if (!fs.existsSync(sessionPath)) {
    return { ...EMPTY_SESSION };
  }

  try {
    const raw = JSON.parse(fs.readFileSync(sessionPath, "utf8")) as unknown;
    const parsed = sortiriSessionSchema.safeParse(raw);
    if (!parsed.success) {
      return { ...EMPTY_SESSION };
    }
    return parsed.data;
  } catch {
    return { ...EMPTY_SESSION };
  }
}

export function saveSession(session: SortiriSession, cwd?: string): void {
  const sessionPath = getSessionPath(cwd);
  writeSessionFile(sessionPath, sortiriSessionSchema.parse(session));
}

export function clearSession(cwd?: string): void {
  saveSession({ ...EMPTY_SESSION }, cwd);
}

export function saveSessionSafe(session: SortiriSession, cwd?: string): void {
  try {
    fs.mkdirSync(getSortiriDir(cwd), { recursive: true });
    saveSession(session, cwd);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Failed to write Sortiri session: ${message}`);
  }
}

export function clearSessionSafe(cwd?: string): void {
  try {
    clearSession(cwd);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Failed to clear Sortiri session: ${message}`);
  }
}
