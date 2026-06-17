import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  attachArtifactSchema,
  finishWorkstreamSchema,
  recordEventSchema,
  startWorkstreamSchema,
} from "./tools/index.js";
import { SortiriLocalClient } from "./localClient.js";

export function registerLocalMcpTools(
  server: McpServer,
  client: SortiriLocalClient,
): void {
  server.tool(
    "start_workstream",
    "Start a new Sortiri workstream before beginning a meaningful task.",
    startWorkstreamSchema.shape,
    async (args) => {
      const input = startWorkstreamSchema.parse(args);
      const result = client.startWorkstream(input);
      return {
        content: [{ type: "text", text: JSON.stringify({ workstreamId: result.workstreamId }) }],
      };
    },
  );

  server.tool(
    "record_event",
    "Record a Sortiri timeline event to the local JSONL journal.",
    recordEventSchema.shape,
    async (args) => {
      const input = recordEventSchema.parse(args);
      const result = client.recordEvent({
        title: input.title,
        summary: input.summary,
        type: input.type,
        metadata: {
          category: input.category,
          entity: input.entity,
          data: input.data,
          severity: input.severity,
          tags: input.tags,
        },
      });
      return {
        content: [{ type: "text", text: JSON.stringify({ eventId: result.eventId }) }],
      };
    },
  );

  server.tool(
    "attach_artifact",
    "Attach a file, diff, URL, or log to the current workstream (local journal).",
    attachArtifactSchema.shape,
    async (args) => {
      const input = attachArtifactSchema.parse(args);
      const result = client.attachArtifact({
        title: input.title,
        content: input.content,
        url: input.url ?? input.filePath,
      });
      return {
        content: [{ type: "text", text: JSON.stringify({ artifactId: result.artifactId }) }],
      };
    },
  );

  server.tool(
    "finish_workstream",
    "Finish the current Sortiri workstream.",
    finishWorkstreamSchema.shape,
    async (args) => {
      const input = finishWorkstreamSchema.parse(args);
      const result = client.finishWorkstream({ summary: input.summary ?? input.outcome });
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    },
  );
}
