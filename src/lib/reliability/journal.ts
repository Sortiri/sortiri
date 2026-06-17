import type { IngestEventEnvelope } from "./eventEnvelope";

export type JournalWriteResult = {
  journalRef: string;
  checksum: string;
};

export type JournalListEntry = {
  journalRef: string;
  receivedAt: number;
  source?: string;
};

export interface IngestJournal {
  write(envelope: IngestEventEnvelope): Promise<JournalWriteResult>;
  read(journalRef: string): Promise<IngestEventEnvelope>;
  list(params: {
    workspaceId: string;
    source?: string;
    from?: number;
    to?: number;
    limit?: number;
  }): Promise<JournalListEntry[]>;
}
