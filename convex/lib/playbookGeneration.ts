import type { Doc, Id } from "../_generated/dataModel";
import type { LessonRecord } from "./lessonsLib";
import type {
  PlaybookInput,
  PlaybookStep,
  PlaybookValidationRequirement,
} from "./playbooksLib";
import { unionLessonEvidence } from "./playbooksLib";
import type { PlaybookTemplate } from "./playbookTemplates";

const LESSON_TYPE_TO_PLAYBOOK_TYPE: Record<
  Doc<"lessons">["type"],
  Doc<"playbooks">["type"]
> = {
  positive_pattern: "product",
  negative_pattern: "engineering",
  risk: "security",
  validation: "engineering",
  product_learning: "product",
  revenue_learning: "revenue",
  engineering_learning: "engineering",
  process_learning: "custom",
  security_learning: "security",
  other: "custom",
};

function countByType(
  lessons: LessonRecord[],
): Map<Doc<"playbooks">["type"], number> {
  const counts = new Map<Doc<"playbooks">["type"], number>();
  for (const lesson of lessons) {
    const pbType = LESSON_TYPE_TO_PLAYBOOK_TYPE[lesson.type];
    counts.set(pbType, (counts.get(pbType) ?? 0) + 1);
  }
  return counts;
}

function dominantPlaybookType(
  lessons: LessonRecord[],
): Doc<"playbooks">["type"] {
  const counts = countByType(lessons);
  let best: Doc<"playbooks">["type"] = "custom";
  let bestCount = 0;
  for (const [type, count] of counts) {
    if (count > bestCount) {
      best = type;
      bestCount = count;
    }
  }
  return best;
}

function buildStepsFromLessons(lessons: LessonRecord[]): PlaybookStep[] {
  const steps: PlaybookStep[] = [];
  let order = 1;
  for (const lesson of lessons) {
    if (lesson.recommendation) {
      steps.push({
        title: lesson.title,
        description: lesson.recommendation,
        required: lesson.importance === "high" || lesson.importance === "critical",
        order: order++,
      });
    }
  }
  if (steps.length === 0) {
    steps.push({
      title: "Review linked lessons",
      description: "Walk through each lesson summary and confirm validation steps.",
      required: true,
      order: 1,
    });
  }
  return steps;
}

function buildValidationFromLessons(
  lessons: LessonRecord[],
): PlaybookValidationRequirement[] {
  const seen = new Set<string>();
  const requirements: PlaybookValidationRequirement[] = [];
  for (const lesson of lessons) {
    if (lesson.type !== "validation" && lesson.type !== "security_learning") {
      continue;
    }
    const commandMatch = lesson.recommendation?.match(
      /npx tsx scripts\/[\w-]+\.ts/,
    );
    const command = commandMatch?.[0];
    const key = command ?? lesson.title;
    if (seen.has(key)) continue;
    seen.add(key);
    requirements.push({
      title: lesson.title,
      command,
      reason: lesson.summary,
      required: lesson.importance === "high" || lesson.importance === "critical",
    });
  }
  if (requirements.length === 0) {
    requirements.push({
      title: "Run unit and sanity tests",
      command: "npm run test:unit",
      reason: "Baseline validation before shipping",
    });
  }
  return requirements;
}

function buildTriggerFromLessons(lessons: LessonRecord[]): string {
  const tags = new Set<string>();
  for (const lesson of lessons) {
    tags.add(lesson.type.replace(/_/g, " "));
    for (const tag of lesson.tags ?? []) {
      if (!tag.startsWith("impact-finding:") && !tag.startsWith("insight-finding:")) {
        tags.add(tag);
      }
    }
  }
  return [...tags].slice(0, 8).join(" ");
}

export function generatePlaybookFromLessons(input: {
  workspaceId: Id<"workspaces">;
  projectId?: Id<"projects">;
  viewId?: Id<"savedViews">;
  lessons: LessonRecord[];
  title?: string;
  lessonIds: Id<"lessons">[];
  template?: PlaybookTemplate;
}): PlaybookInput {
  const type = input.template?.type ?? dominantPlaybookType(input.lessons);
  const evidence = unionLessonEvidence(input.lessons);
  const title =
    input.title ??
    input.template?.title ??
    `Playbook from ${input.lessons.length} lesson${input.lessons.length === 1 ? "" : "s"}`;
  const summary =
    input.template?.summary ??
    `Reusable steps synthesized from ${input.lessons.length} lessons. Correlation only — not causation.`;

  const templateSteps = input.template?.steps ?? [];
  const lessonSteps = buildStepsFromLessons(input.lessons);
  const steps = [...templateSteps, ...lessonSteps].map((step, index) => ({
    ...step,
    order: step.order ?? index + 1,
  }));

  const templateValidation = input.template?.validationRequirements ?? [];
  const lessonValidation = buildValidationFromLessons(input.lessons);
  const validationRequirements = [...templateValidation, ...lessonValidation];

  return {
    workspaceId: input.workspaceId,
    projectId: input.projectId ?? input.lessons.find((l) => l.projectId)?.projectId as
      | Id<"projects">
      | undefined,
    viewId: input.viewId,
    title,
    summary,
    type,
    status: "draft",
    trigger: input.template?.trigger ?? buildTriggerFromLessons(input.lessons),
    steps,
    validationRequirements,
    lessonIds: input.lessonIds,
    evidenceEventIds: evidence.eventIds,
    evidenceWorkstreamIds: evidence.workstreamIds,
    evidenceImpactAnalysisIds: evidence.impactAnalysisIds,
    tags: input.template?.tags,
  };
}

export function playbookInputFromTemplate(
  workspaceId: Id<"workspaces">,
  template: PlaybookTemplate,
): PlaybookInput {
  return {
    workspaceId,
    title: template.title,
    summary: template.summary,
    type: template.type,
    status: "active",
    trigger: template.trigger,
    steps: template.steps,
    validationRequirements: template.validationRequirements,
    tags: template.tags,
  };
}
