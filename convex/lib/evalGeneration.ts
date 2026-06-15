import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { docToPlaybook } from "./playbooksLib";
import { docToLesson } from "./lessonsLib";
import { docToRecommendation } from "./recommendationLib";
import { docToContextPack } from "./contextPackLib";
import { generateValidationRequirements } from "./validationRequirements";
import type { EvalCaseInput, EvalSuiteInput } from "./evalLib";

type DbReadCtx = Pick<QueryCtx, "db">;

export type DraftEvalCase = Omit<EvalCaseInput, "workspaceId" | "evalSuiteId">;

export type DraftEvalSuite = EvalSuiteInput & {
  dedupKey: string;
  cases: DraftEvalCase[];
};

const WEBHOOK_SCRIPTS: Record<string, string> = {
  stripe: "scripts/test-stripe-webhook.ts",
  posthog: "scripts/test-posthog-webhook.ts",
  github: "scripts/test-github-webhook.ts",
};

function haystack(text: string): string {
  return text.toLowerCase();
}

function touchesSecrets(text: string): boolean {
  const lower = haystack(text);
  return ["stripe", "webhook", "secret", "api key", "password", "token", "posthog", "github"].some(
    (term) => lower.includes(term),
  );
}

function addNoSecretLeakCase(cases: DraftEvalCase[], order: number, context: string): void {
  if (!touchesSecrets(context)) return;
  cases.push({
    title: "No secret leak in eval output",
    description: "Scan command and HTTP outputs for leaked secrets.",
    type: "no_secret_leak_check",
    required: true,
    config: { context },
    order,
  });
}

function commandCase(
  title: string,
  command: string,
  required: boolean,
  order: number,
  description?: string,
): DraftEvalCase {
  return {
    title,
    description,
    type: "command",
    required,
    config: { command },
    expected: { exitCode: 0 },
    order,
  };
}

function webhookCase(source: string, order: number): DraftEvalCase | null {
  const script = WEBHOOK_SCRIPTS[source];
  if (!script) return null;
  return {
    title: `Run ${source} webhook tests`,
    type: "source_webhook_check",
    required: true,
    config: { script: `npx tsx ${script}`, source },
    order,
  };
}

export function generateFromPlaybookDoc(
  playbook: ReturnType<typeof docToPlaybook>,
): DraftEvalSuite {
  const cases: DraftEvalCase[] = [];
  let order = 0;

  for (const step of playbook.steps) {
    cases.push({
      title: `Playbook step: ${step.title}`,
      description: step.description,
      type: "playbook_step_check",
      required: step.required ?? true,
      config: { stepTitle: step.title },
      order: order++,
    });
  }

  const requirements =
    playbook.validationRequirements ??
    generateValidationRequirements({
      goal: playbook.title,
      files: [],
      sources: playbook.tags,
    });

  for (const req of requirements) {
    if (req.command) {
      cases.push(commandCase(req.title, req.command, req.required ?? true, order++, req.reason));
    }
  }

  if (cases.length === 0) {
    cases.push(
      commandCase("Run typecheck and unit tests", "npm run typecheck && npm run test:unit", true, order++),
    );
  }

  addNoSecretLeakCase(cases, order++, `${playbook.title} ${playbook.summary}`);

  return {
    workspaceId: playbook.workspaceId as Id<"workspaces">,
    projectId: playbook.projectId as Id<"projects"> | undefined,
    playbookId: playbook.id as Id<"playbooks">,
    title: `Eval: ${playbook.title}`,
    summary: `Private eval suite generated from playbook "${playbook.title}".`,
    source: "playbook",
    priority: "normal",
    tags: playbook.tags,
    dedupKey: `playbook:${playbook.id}`,
    cases,
  };
}

export function generateFromLessonDoc(lesson: ReturnType<typeof docToLesson>): DraftEvalSuite {
  const cases: DraftEvalCase[] = [];
  let order = 0;
  const text = `${lesson.title} ${lesson.summary} ${(lesson.tags ?? []).join(" ")}`;

  const lower = haystack(text);
  for (const source of ["stripe", "posthog", "github"] as const) {
    if (lower.includes(source)) {
      const webhook = webhookCase(source, order++);
      if (webhook) cases.push(webhook);
    }
  }

  if (
    lower.includes("audit") ||
    lower.includes("evidence") ||
    lower.includes("redaction") ||
    lesson.type === "security_learning"
  ) {
    cases.push({
      title: "Evidence safety check",
      type: "evidence_safety_check",
      required: true,
      config: { workspaceId: lesson.workspaceId },
      order: order++,
    });
  }

  if (cases.length === 0) {
    cases.push(
      commandCase("Run unit tests", "npm run test:unit", true, order++, "Baseline validation for lesson context."),
    );
  }

  addNoSecretLeakCase(cases, order++, text);

  return {
    workspaceId: lesson.workspaceId as Id<"workspaces">,
    projectId: lesson.projectId as Id<"projects"> | undefined,
    workstreamId: lesson.workstreamId as Id<"workstreams"> | undefined,
    lessonId: lesson.id as Id<"lessons">,
    title: `Eval: ${lesson.title}`,
    summary: `Private eval suite generated from lesson "${lesson.title}".`,
    source: "lesson",
    priority: lesson.importance === "high" ? "high" : "normal",
    tags: lesson.tags,
    dedupKey: `lesson:${lesson.id}`,
    cases,
  };
}

export function generateFromRecommendationDoc(
  recommendation: ReturnType<typeof docToRecommendation>,
): DraftEvalSuite {
  const cases: DraftEvalCase[] = [];
  let order = 0;

  if (recommendation.generatedContextPackId) {
    cases.push({
      title: "Context pack quality",
      type: "context_quality_check",
      required: true,
      config: {
        contextPackId: recommendation.generatedContextPackId,
        requiredSections: ["Goal:", "Validation Requirements:", "Known Failures:"],
      },
      order: order++,
    });
  }

  cases.push({
    title: "Recommendations API health",
    type: "http_api_check",
    required: true,
    config: { path: "/api/cli/recommendations", method: "GET" },
    expected: { status: 200 },
    order: order++,
  });

  const requirements =
    recommendation.validationRequirements ??
    generateValidationRequirements({
      goal: recommendation.suggestedGoal ?? recommendation.title,
      files: [],
      sources: [recommendation.type, recommendation.source],
    });

  for (const req of requirements) {
    if (req.command) {
      cases.push(commandCase(req.title, req.command, req.required ?? true, order++, req.reason));
    }
  }

  addNoSecretLeakCase(
    cases,
    order++,
    `${recommendation.title} ${recommendation.summary} ${recommendation.type}`,
  );

  return {
    workspaceId: recommendation.workspaceId as Id<"workspaces">,
    projectId: recommendation.projectId as Id<"projects"> | undefined,
    workstreamId: recommendation.workstreamId as Id<"workstreams"> | undefined,
    recommendationId: recommendation.id as Id<"recommendations">,
    contextPackId: recommendation.generatedContextPackId as Id<"contextPacks"> | undefined,
    title: `Eval: ${recommendation.title}`,
    summary: `Private eval suite generated from recommendation "${recommendation.title}".`,
    source: "recommendation",
    priority: recommendation.priority,
    dedupKey: `recommendation:${recommendation.id}`,
    cases,
  };
}

export function generateFromContextPackDoc(
  pack: ReturnType<typeof docToContextPack>,
): DraftEvalSuite {
  const cases: DraftEvalCase[] = [
    {
      title: "Context pack sections present",
      type: "context_quality_check",
      required: true,
      config: {
        contextPackId: pack.id,
        requiredSections: ["CONTEXT PACK", "Goal:", "Recommended Next Steps:"],
      },
      order: 0,
    },
  ];

  const requirements = generateValidationRequirements({
    goal: pack.goal,
    files: pack.request.files,
    sources: pack.request.sources,
  });

  let order = 1;
  for (const req of requirements) {
    if (req.command) {
      cases.push(commandCase(req.title, req.command, req.required ?? true, order++, req.reason));
    }
  }

  addNoSecretLeakCase(cases, order++, `${pack.title} ${pack.goal}`);

  return {
    workspaceId: pack.workspaceId as Id<"workspaces">,
    projectId: pack.projectId as Id<"projects"> | undefined,
    workstreamId: pack.workstreamId as Id<"workstreams"> | undefined,
    contextPackId: pack.id as Id<"contextPacks">,
    playbookId: pack.playbookId as Id<"playbooks"> | undefined,
    lessonId: pack.lessonId as Id<"lessons"> | undefined,
    title: `Eval: ${pack.title}`,
    summary: `Private eval suite generated from context pack "${pack.title}".`,
    source: "context_pack",
    priority: "normal",
    dedupKey: `context_pack:${pack.id}`,
    cases,
  };
}

export function generateFromKnownFailure(input: {
  workspaceId: Id<"workspaces">;
  projectId?: Id<"projects">;
  workstreamId?: Id<"workstreams">;
  failureType: string;
  title: string;
  summary: string;
  recommendedValidation?: string;
}): DraftEvalSuite {
  const cases: DraftEvalCase[] = [];
  let order = 0;

  if (input.recommendedValidation) {
    cases.push(
      commandCase(
        `Validate ${input.failureType}`,
        input.recommendedValidation,
        true,
        order++,
        input.summary,
      ),
    );
  } else {
    cases.push(
      commandCase("Run typecheck and unit tests", "npm run typecheck && npm run test:unit", true, order++),
    );
  }

  if (input.failureType.includes("permission")) {
    cases.push({
      title: "Permission enforcement check",
      type: "permission_check",
      required: true,
      config: { role: "viewer", action: "run_eval", expectBlocked: true },
      order: order++,
    });
  }

  return {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    workstreamId: input.workstreamId,
    title: `Eval: ${input.title}`,
    summary: `Private eval suite for known failure "${input.failureType}".`,
    source: "known_failure",
    priority: "high",
    dedupKey: `known_failure:${input.failureType}:project:${input.projectId ?? "workspace"}`,
    cases,
  };
}

export async function loadPlaybookDraft(
  ctx: DbReadCtx,
  playbookId: Id<"playbooks">,
): Promise<DraftEvalSuite> {
  const doc = await ctx.db.get(playbookId);
  if (!doc) throw new Error("Playbook not found");
  return generateFromPlaybookDoc(docToPlaybook(doc));
}

export async function loadLessonDraft(
  ctx: DbReadCtx,
  lessonId: Id<"lessons">,
): Promise<DraftEvalSuite> {
  const doc = await ctx.db.get(lessonId);
  if (!doc) throw new Error("Lesson not found");
  return generateFromLessonDoc(docToLesson(doc));
}

export async function loadRecommendationDraft(
  ctx: DbReadCtx,
  recommendationId: Id<"recommendations">,
): Promise<DraftEvalSuite> {
  const doc = await ctx.db.get(recommendationId);
  if (!doc) throw new Error("Recommendation not found");
  return generateFromRecommendationDoc(docToRecommendation(doc));
}

export async function loadContextPackDraft(
  ctx: DbReadCtx,
  contextPackId: Id<"contextPacks">,
): Promise<DraftEvalSuite> {
  const doc = await ctx.db.get(contextPackId);
  if (!doc) throw new Error("Context pack not found");
  return generateFromContextPackDoc(docToContextPack(doc));
}
