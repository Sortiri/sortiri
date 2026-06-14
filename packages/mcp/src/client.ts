import type { SortiriMcpConfig } from "./config.js";

type RequestOptions = {
  method?: "POST";
  body?: unknown;
};

export class SortiriApiClient {
  constructor(private readonly config: SortiriMcpConfig) {}

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetch(`${this.config.apiUrl}${path}`, {
      method: options.method ?? "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const payload = (await response.json().catch(() => null)) as
      | (T & { error?: string })
      | { error?: string }
      | null;

    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload && payload.error
          ? payload.error
          : `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return payload as T;
  }

  async startWorkstream(input: { title: string; summary?: string }) {
    return this.request<{ workstreamId: string }>("/api/ingest/workstreams/start", {
      body: {
        workspaceId: this.config.workspaceId,
        projectId: this.config.projectId || undefined,
        title: input.title,
        summary: input.summary,
        actor: {
          type: "agent",
          name: "Cursor Agent",
        },
      },
    });
  }

  async recordEvent(input: {
    workstreamId?: string;
    category: "agent_action" | "code_change" | "company_decision" | "system_event";
    type: string;
    title: string;
    summary?: string;
    entity?: {
      type?: string;
      id?: string;
      name?: string;
      url?: string;
    };
    data?: Record<string, unknown>;
    severity?: "info" | "warning" | "error" | "critical";
    tags?: string[];
  }) {
    return this.request<{ eventId: string }>("/api/ingest/events", {
      body: {
        workspaceId: this.config.workspaceId,
        projectId: this.config.projectId || undefined,
        workstreamId: input.workstreamId,
        source: "cursor",
        category: input.category,
        type: input.type,
        actor: {
          type: "agent",
          name: "Cursor Agent",
        },
        title: input.title,
        summary: input.summary,
        entity: input.entity,
        data: input.data,
        severity: input.severity,
        tags: input.tags,
        occurredAt: Date.now(),
      },
    });
  }

  async attachArtifact(input: {
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
  }) {
    return this.request<{ artifactId: string }>("/api/ingest/artifacts", {
      body: {
        workspaceId: this.config.workspaceId,
        projectId: this.config.projectId || undefined,
        workstreamId: input.workstreamId,
        type: input.type,
        title: input.title,
        summary: input.summary,
        url: input.url,
        content: input.content,
        metadata: input.metadata,
      },
    });
  }

  async finishWorkstream(input: {
    workstreamId: string;
    outcome?: string;
    summary?: string;
  }) {
    return this.request<{ success: true }>("/api/ingest/workstreams/finish", {
      body: {
        workspaceId: this.config.workspaceId,
        projectId: this.config.projectId || undefined,
        workstreamId: input.workstreamId,
        outcome: input.outcome,
        summary: input.summary,
      },
    });
  }
}
