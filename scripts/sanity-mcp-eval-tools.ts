/**
 * Sprint 35 MCP eval tools sanity.
 */

import { SortiriApiClient } from "../packages/mcp/src/client.js";
import { assertNoSecrets, maskApiKey } from "./lib/sanity-eval-helpers.js";

export type McpEvalsSanityInput = {
  appUrl: string;
  rawApiKey: string;
  workspaceId: string;
  evalSuiteId: string;
  workstreamId?: string;
};

export async function runMcpEvalsSanity(input: McpEvalsSanityInput): Promise<void> {
  const client = new SortiriApiClient({
    apiUrl: input.appUrl,
    apiKey: input.rawApiKey,
    workspaceId: input.workspaceId,
    projectId: "",
  });

  const listed = await client.listEvalSuites({ limit: 20 });
  const listJson = JSON.stringify(listed);
  assertNoSecrets(listJson);
  if (!Array.isArray(listed.suites)) {
    throw new Error("sortiri_list_eval_suites missing suites array");
  }

  const detail = await client.getEvalSuite(input.evalSuiteId);
  assertNoSecrets(JSON.stringify(detail));
  if (!detail.suite && !detail.cases) {
    throw new Error("sortiri_get_eval_suite missing suite payload");
  }

  const queued = await client.runEvalSuite(input.evalSuiteId);
  if (!queued.runId) {
    throw new Error("sortiri_run_eval_suite missing runId");
  }

  const runDetail = await client.getEvalRun(queued.runId);
  assertNoSecrets(JSON.stringify(runDetail));
  if (!runDetail.run) {
    throw new Error("sortiri_get_eval_run missing run");
  }

  if (input.workstreamId) {
    const recommended = await client.recommendEvalsForWorkstream(input.workstreamId);
    if (!Array.isArray(recommended.suites)) {
      throw new Error("sortiri_recommend_evals_for_workstream missing suites array");
    }
  }

  console.log(`  [PASS] MCP eval tools passed (${maskApiKey(input.rawApiKey)})`);
}
