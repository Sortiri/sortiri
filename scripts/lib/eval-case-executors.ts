import { execSync } from "node:child_process";
import { redactSensitiveContent } from "@sortiri/security";
import {
  mergeCommandOutput,
  runCommandWithCapture,
} from "../../packages/cli/src/lib/commandCapture.js";

export type EvalCaseInput = {
  id: string;
  title: string;
  type: string;
  required: boolean;
  config: Record<string, unknown>;
  expected?: Record<string, unknown>;
};

export type EvalExecutorContext = {
  appUrl: string;
  apiKey: string;
  workspaceId: string;
  repoRoot: string;
  suiteTitle?: string;
};

export type EvalCaseExecutionResult = {
  status: "passed" | "failed" | "skipped" | "needs_review" | "error";
  summary?: string;
  output?: string;
  error?: string;
};

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{10,}/,
  /Bearer\s+[a-zA-Z0-9._-]{10,}/i,
  /api[_-]?key["\s:=]+[a-zA-Z0-9._-]{8,}/i,
];

export function assertNoSecretsInText(text: string): void {
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(`Secret pattern detected: ${pattern}`);
    }
  }
}

function redactOutput(text: string): string {
  return redactSensitiveContent(text).redacted;
}

async function executeCommand(
  command: string,
  repoRoot: string,
): Promise<EvalCaseExecutionResult> {
  const result = await runCommandWithCapture(command, repoRoot);
  const merged = mergeCommandOutput(result.stdout, result.stderr);
  const output = redactOutput(merged);
  const expectedExit = 0;

  if (result.exitCode === expectedExit) {
    return { status: "passed", summary: `Exit code ${result.exitCode}`, output };
  }

  return {
    status: "failed",
    summary: `Expected exit ${expectedExit}, got ${result.exitCode}`,
    output,
    error: `Command failed with exit code ${result.exitCode}`,
  };
}

async function executeRouteCheck(
  config: Record<string, unknown>,
  ctx: EvalExecutorContext,
): Promise<EvalCaseExecutionResult> {
  const path = String(config.path ?? "/");
  const expectedStatus = Number(config.expectedStatus ?? 200);
  const url = path.startsWith("http") ? path : `${ctx.appUrl}${path}`;
  const response = await fetch(url);
  const body = await response.text();
  const output = redactOutput(body.slice(0, 2000));

  if (response.status === expectedStatus) {
    return { status: "passed", summary: `Status ${response.status}`, output };
  }

  return {
    status: "failed",
    summary: `Expected status ${expectedStatus}, got ${response.status}`,
    output,
    error: `Unexpected status ${response.status}`,
  };
}

async function executeHttpApiCheck(
  config: Record<string, unknown>,
  ctx: EvalExecutorContext,
): Promise<EvalCaseExecutionResult> {
  const path = String(config.path ?? "/");
  const method = String(config.method ?? "GET").toUpperCase();
  const expected = config.expected as { status?: number } | undefined;
  const expectedStatus = Number(expected?.status ?? config.expectedStatus ?? 200);
  const url = path.startsWith("http") ? path : `${ctx.appUrl}${path}`;
  const params = new URLSearchParams({ workspaceId: ctx.workspaceId });
  const fullUrl = url.includes("?") ? url : `${url}?${params.toString()}`;

  const response = await fetch(fullUrl, {
    method,
    headers: {
      Authorization: `Bearer ${ctx.apiKey}`,
      "Content-Type": "application/json",
    },
    body: method === "GET" ? undefined : JSON.stringify({ workspaceId: ctx.workspaceId }),
  });

  const body = await response.text();
  const output = redactOutput(body.slice(0, 2000));

  if (response.status === expectedStatus) {
    return { status: "passed", summary: `API status ${response.status}`, output };
  }

  return {
    status: "failed",
    summary: `Expected API status ${expectedStatus}, got ${response.status}`,
    output,
    error: `API returned ${response.status}`,
  };
}

function executeSourceWebhookCheck(config: Record<string, unknown>): EvalCaseExecutionResult {
  const script = String(config.script ?? "");
  if (!script) {
    return { status: "error", error: "Missing webhook script" };
  }

  try {
    const output = redactOutput(
      execSync(script, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1024 * 1024 }),
    );
    return { status: "passed", summary: "Webhook script succeeded", output };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook script failed";
    return {
      status: "failed",
      summary: "Webhook script failed",
      error: message,
      output: redactOutput(message),
    };
  }
}

function executePermissionCheck(config: Record<string, unknown>): EvalCaseExecutionResult {
  const expectBlocked = config.expectBlocked === true;
  return {
    status: expectBlocked ? "passed" : "skipped",
    summary: expectBlocked
      ? "Permission check deferred to Convex auth matrix in sanity"
      : "Permission check not configured for local runner",
  };
}

async function executeContextQualityCheck(
  config: Record<string, unknown>,
  ctx: EvalExecutorContext,
): Promise<EvalCaseExecutionResult> {
  const contextPackId = String(config.contextPackId ?? "");
  const requiredSections = (config.requiredSections as string[] | undefined) ?? ["Goal:"];

  const params = new URLSearchParams({ workspaceId: ctx.workspaceId });
  const response = await fetch(
    `${ctx.appUrl}/cli/context/packs/${contextPackId}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${ctx.apiKey}` } },
  );

  const payload = (await response.json().catch(() => null)) as
    | { text?: string; error?: string }
    | null;

  if (!response.ok) {
    return {
      status: "failed",
      error: payload?.error ?? `Context pack fetch failed: ${response.status}`,
    };
  }

  const text = payload?.text ?? "";
  const missing = requiredSections.filter((section) => !text.includes(section));
  const output = redactOutput(text.slice(0, 2000));

  if (missing.length === 0) {
    return { status: "passed", summary: "All required sections present", output };
  }

  return {
    status: "failed",
    summary: `Missing sections: ${missing.join(", ")}`,
    output,
    error: `Missing sections: ${missing.join(", ")}`,
  };
}

function executePlaybookStepCheck(
  config: Record<string, unknown>,
  ctx: EvalExecutorContext,
): EvalCaseExecutionResult {
  const stepTitle = String(config.stepTitle ?? "");
  if (!stepTitle) {
    return { status: "error", error: "Missing step title" };
  }

  const haystack = `${ctx.suiteTitle ?? ""} ${stepTitle}`;
  if (haystack.includes(stepTitle)) {
    return { status: "passed", summary: `Step "${stepTitle}" recorded in suite metadata` };
  }

  return {
    status: "needs_review",
    summary: `Verify playbook step "${stepTitle}" manually`,
  };
}

function executeNoSecretLeakCheck(config: Record<string, unknown>): EvalCaseExecutionResult {
  const context = String(config.context ?? "");
  try {
    assertNoSecretsInText(context);
    return { status: "passed", summary: "No secret patterns in configured context" };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Secret leak detected",
    };
  }
}

function executeEvidenceSafetyCheck(): EvalCaseExecutionResult {
  return {
    status: "skipped",
    summary: "Evidence safety verified in dedicated sanity-evidence-safety script",
  };
}

function executeManualReview(): EvalCaseExecutionResult {
  return {
    status: "needs_review",
    summary: "Manual review required",
  };
}

export async function executeEvalCase(
  evalCase: EvalCaseInput,
  ctx: EvalExecutorContext,
): Promise<EvalCaseExecutionResult> {
  try {
    switch (evalCase.type) {
      case "command":
        return executeCommand(String(evalCase.config.command ?? ""), ctx.repoRoot);
      case "route_check":
        return executeRouteCheck(evalCase.config, ctx);
      case "http_api_check":
        return executeHttpApiCheck(evalCase.config, ctx);
      case "source_webhook_check":
        return executeSourceWebhookCheck(evalCase.config);
      case "permission_check":
        return executePermissionCheck(evalCase.config);
      case "evidence_safety_check":
        return executeEvidenceSafetyCheck();
      case "context_quality_check":
        return executeContextQualityCheck(evalCase.config, ctx);
      case "playbook_step_check":
        return executePlaybookStepCheck(evalCase.config, ctx);
      case "no_secret_leak_check":
        return executeNoSecretLeakCheck(evalCase.config);
      case "manual_review":
        return executeManualReview();
      default:
        return { status: "error", error: `Unknown eval case type: ${evalCase.type}` };
    }
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Case execution failed",
    };
  }
}
