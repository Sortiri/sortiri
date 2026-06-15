import type { PlaybookRecord } from "@/types/playbooks";
import type { LessonRecord } from "@/types/lessons";

export function formatPlaybookForCursor(
  playbook: PlaybookRecord,
  lessons: LessonRecord[] = [],
): string {
  const lines: string[] = [
    `# Playbook: ${playbook.title}`,
    "",
    playbook.summary,
    "",
    "## When to use",
    playbook.trigger ?? "(no trigger keywords)",
    "",
    "## Steps",
  ];

  for (const step of playbook.steps) {
    lines.push(
      `${step.order ?? 0}. ${step.title}${step.required ? " (required)" : ""}`,
    );
    if (step.description) {
      lines.push(`   ${step.description}`);
    }
  }

  if (playbook.validationRequirements?.length) {
    lines.push("", "## Validation");
    for (const req of playbook.validationRequirements) {
      lines.push(`- ${req.title}${req.required ? " (required)" : ""}`);
      if (req.command) lines.push(`  Command: \`${req.command}\``);
      if (req.reason) lines.push(`  ${req.reason}`);
    }
  }

  if (lessons.length > 0) {
    lines.push("", "## Related lessons");
    for (const lesson of lessons) {
      lines.push(`- ${lesson.title}: ${lesson.summary}`);
      if (lesson.recommendation) {
        lines.push(`  Recommendation: ${lesson.recommendation}`);
      }
    }
  }

  lines.push(
    "",
    "---",
    "Note: Correlation only — do not claim causation from timeline evidence.",
  );

  return lines.join("\n");
}
