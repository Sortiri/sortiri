import { appendEvent, findRepoRoot, loadConfig } from "@sortiri/local";

export type RecordOptions = {
  type: string;
  title: string;
  summary?: string;
  workstream?: string;
  source?: string;
};

export async function runRecord(options: RecordOptions): Promise<void> {
  const repoRoot = findRepoRoot();
  const config = loadConfig(repoRoot);

  const event = appendEvent(
    {
      source: options.source ?? config.editor ?? "cli",
      type: options.type,
      title: options.title,
      summary: options.summary,
      workstream: options.workstream,
      actor: { type: "human", name: "Sortiri CLI" },
    },
    repoRoot,
  );

  console.log(`Recorded ${event.id}: ${event.title}`);
}
