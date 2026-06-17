import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function runMcp(): Promise<void> {
  const entry = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../mcp/src/server.ts",
  );
  await import(pathToFileURL(entry).href);
}
