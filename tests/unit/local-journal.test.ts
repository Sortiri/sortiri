import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildEnvelope } from "../../src/lib/reliability/eventEnvelope";
import { getJournalRoot, LocalIngestJournal } from "../../src/lib/reliability/localJournal";

describe("local ingest journal", () => {
  const workspaceId = `journal-test-${Date.now()}`;
  const journal = new LocalIngestJournal();

  afterEach(async () => {
    const root = path.join(getJournalRoot(), workspaceId);
    await fs.rm(root, { recursive: true, force: true });
  });

  it("writes and reads envelope by journal ref", async () => {
    const envelope = buildEnvelope({
      workspaceId,
      source: "cli",
      sourceEventId: "evt-journal-1",
      payload: {
        source: "cli",
        category: "agent_action",
        type: "journal_test",
        actor: { type: "agent", name: "Agent" },
        title: "Journal write test",
      },
    });

    const written = await journal.write({ ...envelope, status: "journaled" });
    expect(written.journalRef).toContain(workspaceId);
    expect(written.checksum).toHaveLength(64);

    const read = await journal.read(written.journalRef);
    expect(read.envelopeId).toBe(envelope.envelopeId);
    expect(read.sourceEventId).toBe("evt-journal-1");
  });

  it("lists entries for workspace", async () => {
    const envelope = buildEnvelope({
      workspaceId,
      source: "watcher",
      sourceEventId: "evt-journal-2",
      payload: {
        source: "watcher",
        category: "agent_action",
        type: "journal_list",
        actor: { type: "system", name: "Watcher" },
        title: "List test",
      },
    });
    await journal.write({ ...envelope, status: "journaled" });

    const entries = await journal.list({ workspaceId, source: "watcher", limit: 10 });
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]?.source).toBe("watcher");
  });
});
