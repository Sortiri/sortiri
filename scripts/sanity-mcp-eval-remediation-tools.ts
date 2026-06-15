/**
 * Sprint 36 MCP eval remediation tools sanity.
 */

import { assertNoSecrets, maskApiKey } from "./lib/sanity-eval-helpers.js";
import { SortiriApiClient } from "../packages/mcp/src/client.js";

export type McpEvalRemediationSanityInput = {
  appUrl: string;
  rawApiKey: string;
  workspaceId: string;
  failedEvalRunId: string;
  remediationRecommendationId: string;
  evalSuiteId: string;
};

export async function runMcpEvalRemediationSanity(
  input: McpEvalRemediationSanityInput,
): Promise<void> {
  const client = new SortiriApiClient({
    apiUrl: input.appUrl,
    apiKey: input.rawApiKey,
    workspaceId: input.workspaceId,
  });

  const list = await client.listEvalRemediations({ limit: 20 });
  assertNoSecrets(JSON.stringify(list));

  const generate = await client.generateRemediationFromEval(input.failedEvalRunId);
  assertNoSecrets(JSON.stringify(generate));

  const remediation = await client.getEvalRemediation(input.remediationRecommendationId);
  assertNoSecrets(JSON.stringify(remediation));
  if (!remediation.id) throw new Error("MCP get remediation missing id");

  const convert = await client.convertRemediationToWorkstream(input.remediationRecommendationId);
  assertNoSecrets(JSON.stringify(convert));

  const rerun = await client.rerunEvalForRemediation({
    recommendationId: input.remediationRecommendationId,
    evalSuiteId: input.evalSuiteId,
  });
  assertNoSecrets(JSON.stringify(rerun));
  if (!rerun.runId) throw new Error("MCP rerun missing runId");

  console.log(`  [PASS] MCP eval remediation tools (${maskApiKey(input.rawApiKey)})`);
}
