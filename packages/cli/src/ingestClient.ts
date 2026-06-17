import type { SortiriConfig } from "@sortiri/local";

export const CLI_ACTOR = {
  type: "system" as const,
  name: "Sortiri CLI",
};

export type RecordEventInput = {
  workspaceId?: string;
  projectId?: string | null;
  workstreamId?: string;
  source: "watcher" | "cli" | "system";
  category: "code_change" | "system_event";
  type: string;
  actor: {
    type: "agent" | "human" | "system";
    id?: string;
    name?: string;
    email?: string;
  };
  title: string;
  summary?: string;
  entity?: {
    type?: string;
    id?: string;
    name?: string;
    url?: string;
  };
  data?: Record<string, unknown>;
  artifactIds?: string[];
  severity?: "info" | "warning" | "error" | "critical";
  occurredAt?: number;
};

export type CreateArtifactInput = {
  workspaceId?: string;
  projectId?: string | null;
  workstreamId?: string;
  type:
    | "diff"
    | "file"
    | "url"
    | "screenshot"
    | "document"
    | "log"
    | "command_output"
    | "other";
  title: string;
  summary?: string;
  url?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  sizeBytes?: number;
  language?: string;
  filePath?: string;
  truncated?: boolean;
  emitEvent?: boolean;
};

export class IngestClient {
  constructor(private readonly config: SortiriConfig) {}

  private buildWorkspaceBody(): { workspaceId?: string } {
    return this.config.workspaceId ? { workspaceId: this.config.workspaceId } : {};
  }

  async createArtifact(input: CreateArtifactInput): Promise<{ artifactId: string } | null> {
    const projectId = input.projectId ?? this.config.projectId ?? undefined;

    try {
      const response = await fetch(`${this.config.apiUrl}/ingest/artifacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...this.buildWorkspaceBody(),
          projectId: projectId || undefined,
          workstreamId: input.workstreamId,
          type: input.type,
          title: input.title,
          summary: input.summary,
          url: input.url,
          content: input.content,
          metadata: input.metadata,
          sizeBytes: input.sizeBytes,
          language: input.language,
          filePath: input.filePath,
          truncated: input.truncated,
          emitEvent: input.emitEvent,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { artifactId?: string; error?: string }
        | null;

      if (!response.ok) {
        const message =
          payload?.error ?? `Request failed with status ${response.status}`;
        console.error(`Failed to create Sortiri artifact: ${response.status} ${message}`);
        return null;
      }

      return { artifactId: payload?.artifactId ?? "" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to create Sortiri artifact: ${message}`);
      return null;
    }
  }

  async recordEvent(input: RecordEventInput): Promise<{ eventId: string } | null> {
    const projectId = input.projectId ?? this.config.projectId ?? undefined;

    try {
      const response = await fetch(`${this.config.apiUrl}/ingest/events`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...this.buildWorkspaceBody(),
          ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
          projectId: projectId || undefined,
          workstreamId: input.workstreamId,
          source: input.source,
          category: input.category,
          type: input.type,
          actor: input.actor,
          title: input.title,
          summary: input.summary,
          entity: input.entity?.type
            ? {
                type: input.entity.type,
                id: input.entity.id,
                name: input.entity.name,
                url: input.entity.url,
              }
            : undefined,
          artifactIds: input.artifactIds,
          data: input.data,
          severity: input.severity,
          occurredAt: input.occurredAt ?? Date.now(),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { eventId?: string; error?: string }
        | null;

      if (!response.ok) {
        const message =
          payload?.error ?? `Request failed with status ${response.status}`;
        console.error(`Failed to record Sortiri event: ${response.status} ${message}`);
        return null;
      }

      return { eventId: payload?.eventId ?? "" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to record Sortiri event: ${message}`);
      return null;
    }
  }
}
