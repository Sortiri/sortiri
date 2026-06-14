#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { clearSessionSafe, saveSessionSafe } from "@sortiri/local";
import { SortiriApiClient } from "./client.js";
import { loadConfig } from "./config.js";
import {
  attachArtifactSchema,
  finishWorkstreamSchema,
  recordEventSchema,
  startWorkstreamSchema,
} from "./tools/index.js";

async function main() {
  const config = loadConfig();
  const client = new SortiriApiClient(config);
  const server = new McpServer({
    name: "sortiri",
    version: "0.1.0",
  });

  server.tool(
    "start_workstream",
    "Start a new Sortiri workstream before beginning a meaningful task. Use this when the user asks you to build, change, investigate, debug, research, or design something.",
    startWorkstreamSchema.shape,
    async (args) => {
      const input = startWorkstreamSchema.parse(args);
      const result = await client.startWorkstream(input);
      saveSessionSafe({
        currentWorkstreamId: result.workstreamId,
        currentWorkstreamTitle: input.title,
        startedAt: Date.now(),
      });
      return {
        content: [{ type: "text", text: JSON.stringify({ workstreamId: result.workstreamId }) }],
      };
    },
  );

  server.tool(
    "record_event",
    "Record a Sortiri timeline event. Use this whenever you create a plan, make a decision, change code, create an artifact, complete a step, encounter an error, or change direction.",
    recordEventSchema.shape,
    async (args) => {
      const input = recordEventSchema.parse(args);
      const result = await client.recordEvent(input);
      return {
        content: [{ type: "text", text: JSON.stringify({ eventId: result.eventId }) }],
      };
    },
  );

  server.tool(
    "attach_artifact",
    "Attach a file, diff, URL, document, log, or command output to the current Sortiri workstream.",
    attachArtifactSchema.shape,
    async (args) => {
      const input = attachArtifactSchema.parse(args);
      const result = await client.attachArtifact(input);
      return {
        content: [{ type: "text", text: JSON.stringify({ artifactId: result.artifactId }) }],
      };
    },
  );

  server.tool(
    "finish_workstream",
    "Finish the current Sortiri workstream after the task is completed, blocked, or handed back to the user.",
    finishWorkstreamSchema.shape,
    async (args) => {
      const input = finishWorkstreamSchema.parse(args);
      const result = await client.finishWorkstream(input);
      clearSessionSafe();
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
