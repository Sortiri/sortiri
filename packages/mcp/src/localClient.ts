import {
  appendEvent,
  createWorkstreamId,
  loadSession,
  saveSession,
  type TimelineEvent,
} from "@sortiri/local";

export type LocalWorkstreamInput = {
  title: string;
  summary?: string;
};

export type LocalRecordEventInput = {
  title: string;
  summary?: string;
  type?: string;
  metadata?: Record<string, unknown>;
};

export class SortiriLocalClient {
  startWorkstream(input: LocalWorkstreamInput): { workstreamId: string } {
    const workstreamId = createWorkstreamId();
    saveSession({
      currentWorkstreamId: workstreamId,
      currentWorkstreamTitle: input.title,
      startedAt: Date.now(),
      lastDoctorAt: loadSession().lastDoctorAt ?? null,
    });

    appendEvent({
      source: "mcp",
      type: "agent.action",
      title: input.title,
      summary: input.summary ?? `Started workstream: ${input.title}`,
      workstream: workstreamId,
      actor: { type: "agent", name: "Sortiri MCP" },
    });

    return { workstreamId };
  }

  recordEvent(input: LocalRecordEventInput): { eventId: string } {
    const session = loadSession();
    const event: TimelineEvent = appendEvent({
      source: "mcp",
      type: input.type ?? "agent.action",
      title: input.title,
      summary: input.summary,
      workstream: session.currentWorkstreamId ?? undefined,
      actor: { type: "agent", name: "Sortiri MCP" },
      metadata: input.metadata,
    });
    return { eventId: event.id };
  }

  finishWorkstream(input?: { summary?: string }): { ok: true } {
    const session = loadSession();
    if (session.currentWorkstreamId) {
      appendEvent({
        source: "mcp",
        type: "agent.action",
        title: session.currentWorkstreamTitle ?? "Workstream finished",
        summary: input?.summary ?? "Workstream completed",
        workstream: session.currentWorkstreamId,
        actor: { type: "agent", name: "Sortiri MCP" },
      });
    }
    saveSession({
      currentWorkstreamId: null,
      currentWorkstreamTitle: null,
      startedAt: null,
      lastDoctorAt: session.lastDoctorAt ?? null,
    });
    return { ok: true };
  }

  attachArtifact(input: {
    title: string;
    content?: string;
    url?: string;
  }): { artifactId: string } {
    const session = loadSession();
    const artifactId = `art_${Date.now()}`;
    appendEvent({
      source: "mcp",
      type: "agent.action",
      title: input.title,
      summary: input.url ?? "Artifact attached",
      workstream: session.currentWorkstreamId ?? undefined,
      actor: { type: "agent", name: "Sortiri MCP" },
      metadata: {
        artifactId,
        content: input.content,
        url: input.url,
      },
    });
    return { artifactId };
  }
}

export function cloudRequiredMessage(tool: string): string {
  return JSON.stringify({
    error: `${tool} requires Sortiri Cloud. Run sortiri init with a setup token or use local record/export commands.`,
  });
}
