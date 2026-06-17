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
    return this.request<{ workstreamId: string }>("/ingest/workstreams/start", {
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
    return this.request<{ eventId: string }>("/ingest/events", {
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
    return this.request<{ artifactId: string }>("/ingest/artifacts", {
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
    return this.request<{ success: true }>("/ingest/workstreams/finish", {
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
    }>("/mcp/context/packs", {
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
    }>(`/mcp/context/packs/${contextPackId}?${params.toString()}`, {
      method: "GET",
    });
  }

  async getProjectMemory(input: {
    query?: string;
    projectId?: string;
    timeWindowDays?: number;
  }) {
    return this.request<Record<string, unknown>>("/mcp/context/project-memory", {
      body: {
        workspaceId: this.config.workspaceId,
        query: input.query,
        projectId: input.projectId ?? (this.config.projectId || undefined),
        timeWindowDays: input.timeWindowDays,
      },
    });
  }

  async getEntityMemory(input: { entityKeyOrId: string; timeWindowDays?: number }) {
    return this.request<Record<string, unknown>>("/mcp/context/entity-memory", {
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
    return this.request<unknown[]>("/mcp/context/known-failures", {
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
    return this.request<unknown[]>("/mcp/context/validation-requirements", {
      body: {
        workspaceId: this.config.workspaceId,
        goal: input.goal,
        files: input.files,
        sources: input.sources,
      },
    });
  }

  async getRecommendedPlaybook(input: { goal: string; projectId?: string }) {
    return this.request<Record<string, unknown> | null>("/mcp/context/recommended-playbook", {
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
      `/mcp/recommendations?${params.toString()}`,
      { method: "GET" },
    );
  }

  async getRecommendation(recommendationId: string) {
    const params = new URLSearchParams({
      workspaceId: this.config.workspaceId,
    });
    return this.request<{ recommendation: Record<string, unknown> }>(
      `/mcp/recommendations/${recommendationId}?${params.toString()}`,
      { method: "GET" },
    );
  }

  async generateRecommendations() {
    return this.request<{ createdIds: string[]; count: number }>(
      "/mcp/recommendations/generate",
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
    }>(`/mcp/recommendations/${recommendationId}/convert`, {
      body: { workspaceId: this.config.workspaceId },
    });
  }

  async generateContextFromRecommendation(recommendationId: string) {
    return this.request<{
      contextPackId: string;
      summary?: string;
      counts?: Record<string, number>;
    }>(`/mcp/recommendations/${recommendationId}/context-pack`, {
      body: { workspaceId: this.config.workspaceId },
    });
  }

  async listEvalSuites(input: { limit?: number } = {}) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    if (input.limit !== undefined) params.set("limit", String(input.limit));
    return this.request<{ suites: unknown[] }>(`/mcp/evals?${params.toString()}`, {
      method: "GET",
    });
  }

  async getEvalSuite(evalSuiteId: string) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    return this.request<Record<string, unknown>>(
      `/mcp/evals/${evalSuiteId}?${params.toString()}`,
      { method: "GET" },
    );
  }

  async generateEvalSuite(input: {
    source: "playbook" | "lesson" | "recommendation" | "context_pack" | "known_failure";
    entityId: string;
  }) {
    return this.request<{ suiteId: string; created: boolean }>("/mcp/evals/generate", {
      body: {
        workspaceId: this.config.workspaceId,
        source: input.source,
        entityId: input.entityId,
      },
    });
  }

  async runEvalSuite(evalSuiteId: string) {
    return this.request<{ runId: string; cases?: unknown[] }>(
      `/mcp/evals/${evalSuiteId}/run`,
      { body: { workspaceId: this.config.workspaceId } },
    );
  }

  async getEvalRun(evalRunId: string) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    return this.request<Record<string, unknown>>(
      `/mcp/evals/runs/${evalRunId}?${params.toString()}`,
      { method: "GET" },
    );
  }

  async recommendEvalsForWorkstream(workstreamId: string) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    return this.request<{ suites: unknown[] }>(
      `/mcp/evals/recommend/workstream/${workstreamId}?${params.toString()}`,
      { method: "GET" },
    );
  }

  async generateRemediationFromEval(evalRunId: string) {
    return this.request<{ recommendationIds: string[]; count: number }>(
      "/mcp/evals/remediation/generate",
      { body: { workspaceId: this.config.workspaceId, evalRunId } },
    );
  }

  async listEvalRemediations(input: { limit?: number } = {}) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    if (input.limit !== undefined) params.set("limit", String(input.limit));
    return this.request<{ remediations: unknown[] }>(
      `/mcp/evals/remediation?${params.toString()}`,
      { method: "GET" },
    );
  }

  async getEvalRemediation(recommendationId: string) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    return this.request<Record<string, unknown>>(
      `/mcp/evals/remediation/${recommendationId}?${params.toString()}`,
      { method: "GET" },
    );
  }

  async convertRemediationToWorkstream(recommendationId: string) {
    return this.request<Record<string, unknown>>(
      `/mcp/recommendations/${recommendationId}/convert`,
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
    return this.request<Record<string, unknown>>("/mcp/evals/remediation/rerun", {
      body: {
        workspaceId: this.config.workspaceId,
        recommendationId: input.recommendationId,
        evalSuiteId,
      },
    });
  }

  async listIngestDeliveries(input: {
    status?: string;
    source?: string;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    if (input.status) params.set("status", input.status);
    if (input.source) params.set("source", input.source);
    if (input.limit !== undefined) params.set("limit", String(input.limit));
    return this.request<{ deliveries: unknown[] }>(
      `/mcp/reliability?${params.toString()}`,
      { method: "GET" },
    );
  }

  async getIngestDelivery(deliveryId: string) {
    const params = new URLSearchParams({
      workspaceId: this.config.workspaceId,
      deliveryId,
    });
    return this.request<{ delivery: unknown }>(
      `/mcp/reliability?${params.toString()}`,
      { method: "GET" },
    );
  }

  async listDeadLetters(input: { status?: string; limit?: number } = {}) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    if (input.status) params.set("status", input.status);
    if (input.limit !== undefined) params.set("limit", String(input.limit));
    return this.request<{ deadLetters: unknown[] }>(
      `/mcp/reliability/dead-letters?${params.toString()}`,
      { method: "GET" },
    );
  }

  async replayIngestDelivery(input: {
    deliveryId?: string;
    deadLetterId?: string;
    payload?: unknown;
  }) {
    return this.request<Record<string, unknown>>("/mcp/reliability/replay", {
      body: {
        workspaceId: this.config.workspaceId,
        deliveryId: input.deliveryId,
        deadLetterId: input.deadLetterId,
        payload: input.payload,
      },
    });
  }

  async getSourceHealth() {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    return this.request<{ health: Record<string, unknown> }>(
      `/mcp/reliability/health?${params.toString()}`,
      { method: "GET" },
    );
  }

  async recordDecision(input: {
    title: string;
    summary?: string;
    decisionType?: string;
    rationale?: string;
    expectedOutcome?: string;
    rollbackPlan?: string;
    workstreamId?: string;
  }) {
    return this.request<Record<string, unknown>>("/mcp/decisions", {
      body: { workspaceId: this.config.workspaceId, ...input },
    });
  }

  async listDecisions(input: { limit?: number } = {}) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    if (input.limit !== undefined) params.set("limit", String(input.limit));
    return this.request<{ decisions: unknown[] }>(
      `/mcp/decisions?${params.toString()}`,
      { method: "GET" },
    );
  }

  async getDecision(decisionId: string) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    return this.request<Record<string, unknown>>(
      `/mcp/decisions/${decisionId}?${params.toString()}`,
      { method: "GET" },
    );
  }

  async linkDecisionToWorkstream(input: { decisionId: string; workstreamId: string }) {
    return this.request<Record<string, unknown>>(
      `/mcp/decisions/${input.decisionId}/link`,
      { body: {
        workspaceId: this.config.workspaceId,
        workstreamId: input.workstreamId,
      } },
    );
  }

  async createRollback(input: {
    decisionId?: string;
    title: string;
    summary?: string;
    reason?: string;
  }) {
    const path = input.decisionId
      ? `/mcp/decisions/${input.decisionId}/rollback`
      : "/mcp/decisions/rollback";
    return this.request<Record<string, unknown>>(path, {
      body: { workspaceId: this.config.workspaceId, ...input },
    });
  }

  async listDecisionCandidates(input: { limit?: number } = {}) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    if (input.limit !== undefined) params.set("limit", String(input.limit));
    return this.request<{ candidates: unknown[] }>(
      `/mcp/decisions/candidates?${params.toString()}`,
      { method: "GET" },
    );
  }

  async confirmDecisionCandidate(candidateId: string) {
    return this.request<Record<string, unknown>>(
      `/mcp/decisions/candidates/${candidateId}/confirm`,
      { body: { workspaceId: this.config.workspaceId } },
    );
  }

  async dismissDecisionCandidate(candidateId: string) {
    return this.request<Record<string, unknown>>(
      `/mcp/decisions/candidates/${candidateId}/dismiss`,
      { body: { workspaceId: this.config.workspaceId } },
    );
  }

  async recordIncident(input: {
    title: string;
    summary?: string;
    severity?: string;
    workstreamId?: string;
    service?: string;
    environment?: string;
  }) {
    return this.request<Record<string, unknown>>("/mcp/incidents", {
      body: { workspaceId: this.config.workspaceId, severity: "error", ...input },
    });
  }

  async listIncidents(input: {
    status?: string;
    severity?: string;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    if (input.limit !== undefined) params.set("limit", String(input.limit));
    if (input.status) params.set("status", input.status);
    if (input.severity) params.set("severity", input.severity);
    return this.request<{ incidents: unknown[] }>(
      `/mcp/incidents?${params.toString()}`,
      { method: "GET" },
    );
  }

  async getIncident(incidentId: string) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    return this.request<Record<string, unknown>>(
      `/mcp/incidents/${incidentId}?${params.toString()}`,
      { method: "GET" },
    );
  }

  async resolveIncident(input: {
    incidentId: string;
    rootCause?: string;
    mitigation?: string;
    rollbackSummary?: string;
  }) {
    return this.request<Record<string, unknown>>(
      `/mcp/incidents/${input.incidentId}/resolve`,
      {
        body: {
          workspaceId: this.config.workspaceId,
          rootCause: input.rootCause,
          mitigation: input.mitigation,
          rollbackSummary: input.rollbackSummary,
        },
      },
    );
  }

  async createIncidentRollback(input: {
    incidentId: string;
    title: string;
    summary?: string;
    reason?: string;
  }) {
    return this.request<Record<string, unknown>>(
      `/mcp/incidents/${input.incidentId}/rollback`,
      {
        body: {
          workspaceId: this.config.workspaceId,
          title: input.title,
          summary: input.summary,
          reason: input.reason,
        },
      },
    );
  }

  async linkIncidentToWorkstream(input: { incidentId: string; workstreamId: string }) {
    return this.request<Record<string, unknown>>(
      `/mcp/incidents/${input.incidentId}/link`,
      {
        body: {
          workspaceId: this.config.workspaceId,
          workstreamId: input.workstreamId,
        },
      },
    );
  }

  async linkIncidentToDecision(input: { incidentId: string; decisionId: string }) {
    return this.request<Record<string, unknown>>(
      `/mcp/incidents/${input.incidentId}/link`,
      {
        body: {
          workspaceId: this.config.workspaceId,
          decisionId: input.decisionId,
        },
      },
    );
  }

  async listObservabilitySignals(input: {
    incidentId?: string;
    severity?: string;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams({ workspaceId: this.config.workspaceId });
    if (input.limit !== undefined) params.set("limit", String(input.limit));
    if (input.severity) params.set("severity", input.severity);
    if (input.incidentId) params.set("incidentId", input.incidentId);
    return this.request<{ signals: unknown[] }>(
      `/mcp/incidents/signals?${params.toString()}`,
      { method: "GET" },
    );
  }
}
