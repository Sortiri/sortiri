/**
 * Sprint 40 MCP incident tools sanity.
 */

import { SortiriApiClient } from "../packages/mcp/src/client.js";

export type McpIncidentToolsSanityInput = {
  apiUrl: string;
  rawApiKey: string;
  workspaceId: string;
  onStep?: (label: string) => void;
};

export async function runMcpIncidentToolsSanity(
  input: McpIncidentToolsSanityInput,
): Promise<string> {
  const step = input.onStep ?? ((label: string) => console.log(`  [PASS] ${label}`));
  const client = new SortiriApiClient({
    apiUrl: input.apiUrl,
    apiKey: input.rawApiKey,
    workspaceId: input.workspaceId,
    projectId: "",
  });

  const recorded = await client.recordIncident({
    title: `MCP sanity incident ${Date.now()}`,
    severity: "error",
    service: "api",
  });
  step("MCP recordIncident");

  if (!recorded || typeof recorded !== "object") {
    throw new Error("MCP recordIncident returned empty payload");
  }

  const recordId =
    typeof (recorded as { id?: unknown }).id === "string"
      ? (recorded as { id: string }).id
      : undefined;
  if (!recordId) {
    throw new Error("MCP recordIncident missing id");
  }

  const listed = await client.listIncidents({ limit: 5 });
  step("MCP listIncidents");
  if (!Array.isArray(listed.incidents)) {
    throw new Error("MCP listIncidents missing incidents array");
  }

  await client.getIncident(recordId);
  step("MCP getIncident");

  const signals = await client.listObservabilitySignals({ limit: 5 });
  step("MCP listObservabilitySignals");
  if (!Array.isArray(signals.signals)) {
    throw new Error("MCP listObservabilitySignals missing signals array");
  }

  return recordId;
}
