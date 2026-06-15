import type { Id } from "../../../convex/_generated/dataModel";

export async function generateLessonsFromImpact(
  generate: (args: { impactAnalysisId: Id<"impactAnalyses"> }) => Promise<{
    lessonIds: Id<"lessons">[];
  }>,
  impactAnalysisId: string,
): Promise<string[]> {
  const result = await generate({
    impactAnalysisId: impactAnalysisId as Id<"impactAnalyses">,
  });
  return result.lessonIds.map(String);
}
