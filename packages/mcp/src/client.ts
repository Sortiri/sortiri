import type { SortiriMcpConfig } from "./config.js";
import { redactSensitiveContent } from "@sortiri/security";

type RequestOptions = {
  method?: "GET" | "POST";
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
    let content = input.content;
    let metadata = input.metadata;
    if (typeof content === "string") {
      content = redactSensitiveContent(content).redacted;
    }
    if (metadata !== undefined) {
      try {
        const serialized = JSON.stringify(metadata);
        metadata = JSON.parse(redactSensitiveContent(serialized).redacted) as Record<
          string,
          unknown
        >;
      } catch {
        // Keep metadata as-is when not JSON-serializable.
      }
    }
    return this.request<{ artifactId: string }>("/api/ingest/artifacts", {
      body: {
        workspaceId: this.config.workspaceId,
        projectId: this.config.projectId || undefined,
        workstreamId: input.workstreamId,
        type: input.type,
        title: input.title,
        summary: input.summary,
        url: input.url,
        content,
        metadata,
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

  async createContextPack(input: {
    goal: string;
    title?: string;
    projectId?: string;
    workstreamId?: string;
    entityId?: string;
    files?: string[];
    timeWindowDays?: number;
  }) {
    return this.request<{
      contextPackId: string;
      summary: string;
      text: string;
      counts: Record<string, number>;
    }>("/api/cli/context/packs", {
      body: {
        workspaceId: this.config.workspaceId,
        goal: input.goal,
        title: input.title,
        projectId: input.projectId ?? (this.config.projectId || undefined),
        workstreamId: input.workstreamId,
        entityId: input.entityId,
        files: input.files,
        timeWindowDays: input.timeWindowDays,
      },
    });
  }

  async getContextPack(contextPackId: string) {
    const params = new URLSearchParams({
      workspaceId: this.config.workspaceId,
    });
    return this.request<{
      text: string;
      pack: Record<string, unknown>;
      items: unknown[];
    }>(`/api/cli/context/packs/${contextPackId}?${params.toString()}`, {
      method: "GET",
    });
  }

  async getProjectMemory(input: {
    query?: string;
    projectId?: string;
    timeWindowDays?: number;
  }) {
    return this.request<Record<string, unknown>>("/api/cli/context/project-memory", {
      body: {
        workspaceId: this.config.workspaceId,
        query: input.query,
        projectId: input.projectId ?? (this.config.projectId || undefined),
        timeWindowDays: input.timeWindowDays,
      },
    });
  }

  async getEntityMemory(input: { entityKeyOrId: string; timeWindowDays?: number }) {
    return this.request<Record<string, unknown>>("/api/cli/context/entity-memory", {
      body: {
        workspaceId: this.config.workspaceId,
        entityKeyOrId: input.entityKeyOrId,
        timeWindowDays: input.timeWindowDays,
      },
    });
  }

  async getKnownFailures(input: {
    goal?: string;
    files?: string[];
    projectId?: string;
    timeWindowDays?: number;
  }) {
    return this.request<unknown[]>("/api/cli/context/known-failures", {
      body: {
        workspaceId: this.config.workspaceId,
        goal: input.goal,
        files: input.files,
        projectId: input.projectId ?? (this.config.projectId || undefined),
        timeWindowDays: input.timeWindowDays,
      },
    });
  }

  async getValidationRequirements(input: {
    goal: string;
    files?: string[];
    sources?: string[];
  }) {
    return this.request<unknown[]>("/api/cli/context/validation-requirements", {
      body: {
        workspaceId: this.config.workspaceId,
        goal: input.goal,
        files: input.files,
        sources: input.sources,
      },
    });
  }

  async getRecommendedPlaybook(input: { goal: string; projectId?: string }) {
    return this.request<Record<string, unknown> | null>("/api/cli/context/recommended-playbook", {
      body: {
        workspaceId: this.config.workspaceId,
        goal: input.goal,
        projectId: input.projectId ?? (this.config.projectId || undefined),
      },
    });
  }

  async listRecommendations(input: { limit?: number } = {}) {
    const params = new URLSearchParams({
      workspaceId: this.config.workspaceId,
    });
    if (input.limit !== undefined) {
      params.set("limit", String(input.limit));
    }
    return this.request<{ recommendations: unknown[] }>(
      `/api/cli/recommendations?${params.toString()}`,
      { method: "GET" },
    );
  }

  async getRecommendation(recommendationId: string) {
    const params = new URLSearchParams({
      workspaceId: this.config.workspaceId,
    });
    return this.request<{ recommendation: Record<string, unknown> }>(
      `/api/cli/recommendations/${recommendationId}?${params.toString()}`,
      { method: "GET" },
    );
  }

  async generateRecommendations() {
    return this.request<{ createdIds: string[]; count: number }>(
      "/api/cli/recommendations/generate",
      {
        body: { workspaceId: this.config.workspaceId },
      },
    );
  }

  async convertRecommendationToWorkstream(recommendationId: string) {
    return this.request<{
      workstreamId: string;
      contextPackId: string;
      recommendedPlaybookId?: string;
    }>(`/api/cli/recommendations/${recommendationId}/convert`, {
      body: { workspaceId: this.config.workspaceId },
    });
  }

  async generateContextFromRecommendation(recommendationId: string) {
    return this.request<{
      contextPackId: string;
      summary?: string;
      counts?: Record<string, number>;
    }>(`/api/cli/recommendations/${recommendationId}/context-pack`, {
      body: { workspaceId: this.config.workspaceId },
    });
  }

  async listEvalSuites(input: { limit?: number } = {}) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    if (input.limit !== undefined) params.set("limit", String(input.limit));
    return this.request<{ suites: unknown[] }>(`/api/cli/evals?${params.toString()}`, {
      method: "GET",
    });
  }

  async getEvalSuite(evalSuiteId: string) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    return this.request<Record<string, unknown>>(
      `/api/cli/evals/${evalSuiteId}?${params.toString()}`,
      { method: "GET" },
    );
  }

  async generateEvalSuite(input: {
    source: "playbook" | "lesson" | "recommendation" | "context_pack" | "known_failure";
    entityId: string;
  }) {
    return this.request<{ suiteId: string; created: boolean }>("/api/cli/evals/generate", {
      body: {
        workspaceId: this.config.workspaceId,
        source: input.source,
        entityId: input.entityId,
      },
    });
  }

  async runEvalSuite(evalSuiteId: string) {
    return this.request<{ runId: string; cases?: unknown[] }>(
      `/api/cli/evals/${evalSuiteId}/run`,
      { body: { workspaceId: this.config.workspaceId } },
    );
  }

  async getEvalRun(evalRunId: string) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    return this.request<Record<string, unknown>>(
      `/api/cli/evals/runs/${evalRunId}?${params.toString()}`,
      { method: "GET" },
    );
  }

  async recommendEvalsForWorkstream(workstreamId: string) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    return this.request<{ suites: unknown[] }>(
      `/api/cli/evals/recommend/workstream/${workstreamId}?${params.toString()}`,
      { method: "GET" },
    );
  }

  async generateRemediationFromEval(evalRunId: string) {
    return this.request<{ recommendationIds: string[]; count: number }>(
      "/api/cli/evals/remediation/generate",
      { body: { workspaceId: this.config.workspaceId, evalRunId } },
    );
  }

  async listEvalRemediations(input: { limit?: number } = {}) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    if (input.limit !== undefined) params.set("limit", String(input.limit));
    return this.request<{ remediations: unknown[] }>(
      `/api/cli/evals/remediation?${params.toString()}`,
      { method: "GET" },
    );
  }

  async getEvalRemediation(recommendationId: string) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    return this.request<Record<string, unknown>>(
      `/api/cli/evals/remediation/${recommendationId}?${params.toString()}`,
      { method: "GET" },
    );
  }

  async convertRemediationToWorkstream(recommendationId: string) {
    return this.request<Record<string, unknown>>(
      `/api/cli/recommendations/${recommendationId}/convert`,
      { body: { workspaceId: this.config.workspaceId } },
    );
  }

  async rerunEvalForRemediation(input: { recommendationId: string; evalSuiteId?: string }) {
    let evalSuiteId = input.evalSuiteId;
    if (!evalSuiteId) {
      const rec = await this.getEvalRemediation(input.recommendationId);
      evalSuiteId = rec.evalSuiteId as string | undefined;
      if (!evalSuiteId) throw new Error("evalSuiteId not found on remediation recommendation");
    }
    return this.request<Record<string, unknown>>("/api/cli/evals/remediation/rerun", {
      body: {
        workspaceId: this.config.workspaceId,
        recommendationId: input.recommendationId,
        evalSuiteId,
      },
    });
  }
}
