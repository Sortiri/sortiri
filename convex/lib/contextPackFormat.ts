import type {
  ContextPackItemRecord,
  ContextPackRecord,
} from "./contextPackLib";

function section(title: string, items: ContextPackItemRecord[]): string[] {
  if (items.length === 0) return [];
  return [title, ...items.map((item) => `- ${item.title}${item.summary ? `: ${item.summary}` : ""}`), ""];
}

export function formatContextPackText(
  pack: ContextPackRecord,
  items: ContextPackItemRecord[],
): string {
  const byType = (type: ContextPackItemRecord["itemType"]) =>
    items.filter((item) => item.itemType === type);

  const lines: string[] = [
    "CONTEXT PACK",
    "",
    "Goal:",
    pack.goal,
    "",
  ];

  lines.push(...section("Recommended Playbook:", byType("playbook")));
  lines.push(...section("Relevant Lessons:", byType("lesson")));
  lines.push(...section("Relevant Decisions:", byType("decision")));
  lines.push(...section("Related Workstreams:", byType("workstream")));
  lines.push(...section("Related Files / Entities:", byType("entity")));
  lines.push(...section("Known Failures:", byType("known_failure")));
  lines.push(...section("Impact Context:", byType("impact_analysis")));
  lines.push(...section("Product / Revenue Context:", byType("event").filter((item) =>
    (item.summary ?? "").toLowerCase().includes("product") ||
    (item.summary ?? "").toLowerCase().includes("revenue") ||
    (item.title ?? "").toLowerCase().includes("stripe") ||
    (item.title ?? "").toLowerCase().includes("posthog"),
  )));
  lines.push(...section("Insights:", byType("insight")));
  lines.push(...section("Validation Requirements:", byType("validation_requirement")));
  lines.push(...section("Evidence:", byType("artifact")));

  const otherEvents = byType("event").filter(
    (item) =>
      !lines.some((line) => line.includes(item.title)) &&
      !((item.summary ?? "").toLowerCase().includes("product") ||
        (item.summary ?? "").toLowerCase().includes("revenue")),
  );
  lines.push(...section("Related Events:", otherEvents));

  lines.push("Recommended Next Steps:");
  const validations = byType("validation_requirement");
  if (validations.length > 0) {
    for (const req of validations.slice(0, 5)) {
      lines.push(`- ${req.title}${req.summary ? ` (${req.summary})` : ""}`);
    }
  } else {
    lines.push("- Review lessons and known failures before changing related systems.");
    lines.push("- Record plan and validation results in Sortiri.");
  }

  if (pack.summary) {
    lines.push("", "Summary:", pack.summary);
  }

  return lines.join("\n").trim();
}

export function buildContextPackSummary(
  pack: ContextPackRecord,
  items: ContextPackItemRecord[],
): string {
  const counts = pack.counts;
  if (!counts) {
    return `Context pack for: ${pack.goal}`;
  }
  return [
    `Context pack for: ${pack.goal}`,
    `${counts.lessons} lessons, ${counts.failures} known failures, ${counts.impacts} impact analyses, ${counts.validationRequirements} validation requirements.`,
  ].join(" ");
}
