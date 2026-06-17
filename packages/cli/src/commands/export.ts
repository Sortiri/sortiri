import fs from "node:fs";
import path from "node:path";
import { exportEvents, findRepoRoot } from "@sortiri/local";

export type ExportOptions = {
  out?: string;
};

export async function runExport(options: ExportOptions = {}): Promise<void> {
  const repoRoot = findRepoRoot();
  const data = exportEvents(repoRoot);

  if (options.out) {
    const outPath = path.isAbsolute(options.out)
      ? options.out
      : path.join(repoRoot, options.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, data, "utf8");
    console.log(`Exported timeline to ${outPath}`);
    return;
  }

  process.stdout.write(data);
}
