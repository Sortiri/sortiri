import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { IngestEventEnvelope } from "./eventEnvelope";
import type { IngestJournal, JournalListEntry, JournalWriteResult } from "./journal";

const JOURNAL_ROOT = path.join(process.cwd(), ".sortiri", "journal");
const INDEX_PATH = path.join(JOURNAL_ROOT, "index.jsonl");

function checksum(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function journalPathForEnvelope(envelope: IngestEventEnvelope): string {
  const date = new Date(envelope.receivedAt);
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return path.join(
    JOURNAL_ROOT,
    envelope.workspaceId,
    yyyy,
    mm,
    dd,
    `${envelope.envelopeId}.json`,
  );
}

export class LocalIngestJournal implements IngestJournal {
  async write(envelope: IngestEventEnvelope): Promise<JournalWriteResult> {
    const filePath = journalPathForEnvelope(envelope);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const content = JSON.stringify(envelope, null, 2);
    await fs.writeFile(filePath, content, "utf8");

    const journalRef = path.relative(JOURNAL_ROOT, filePath);
    const indexLine = JSON.stringify({
      journalRef,
      workspaceId: envelope.workspaceId,
      source: envelope.source,
      envelopeId: envelope.envelopeId,
      receivedAt: envelope.receivedAt,
    });
    await fs.mkdir(path.dirname(INDEX_PATH), { recursive: true });
    await fs.appendFile(INDEX_PATH, `${indexLine}\n`, "utf8");

    return { journalRef, checksum: checksum(content) };
  }

  async read(journalRef: string): Promise<IngestEventEnvelope> {
    const filePath = path.join(JOURNAL_ROOT, journalRef);
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as IngestEventEnvelope;
  }

  async list(params: {
    workspaceId: string;
    source?: string;
    from?: number;
    to?: number;
    limit?: number;
  }): Promise<JournalListEntry[]> {
    const limit = params.limit ?? 100;
    let indexContent = "";
    try {
      indexContent = await fs.readFile(INDEX_PATH, "utf8");
    } catch {
      return [];
    }

    const entries: JournalListEntry[] = [];
    for (const line of indexContent.split("\n")) {
      if (!line.trim()) continue;
      const row = JSON.parse(line) as {
        journalRef: string;
        workspaceId: string;
        source: string;
        receivedAt: number;
      };
      if (row.workspaceId !== params.workspaceId) continue;
      if (params.source && row.source !== params.source) continue;
      if (params.from && row.receivedAt < params.from) continue;
      if (params.to && row.receivedAt > params.to) continue;
      entries.push({
        journalRef: row.journalRef,
        receivedAt: row.receivedAt,
        source: row.source,
      });
    }

    return entries
      .sort((a, b) => b.receivedAt - a.receivedAt)
      .slice(0, limit);
  }
}

export function getJournalRoot(): string {
  return JOURNAL_ROOT;
}
