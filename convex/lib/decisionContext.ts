import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { docToDecision } from "./decisionsLib";
import { filterDecisionsByAccess } from "./decisionPermissions";
import { docToRollback } from "./rollbackEventsLib";
import type { AccessibleProjects } from "./projectAccessLib";

type DbReadCtx = Pick<QueryCtx, "db">;

export type ImpactDecisionContext = {
  decisions: Array<{ title: string; summary?: string; decidedAt: number; status: string }>;
  rollbacks: Array<{ title: string; summary?: string; rolledBackAt: number }>;
  candidates: Array<{ title: string; summary?: string; confidence: string }>;
};

export async function fetchDecisionContextForImpactWindow(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  options: {
    projectId?: Id<"projects">;
    windowStart: number;
    windowEnd: number;
    accessible: AccessibleProjects;
    role: string;
  },
): Promise<ImpactDecisionContext> {
  const decisionDocs = await ctx.db
    .query("decisions")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  const filteredDecisions = filterDecisionsByAccess(
    decisionDocs.filter(
      (d) =>
        d.decidedAt >= options.windowStart &&
        d.decidedAt < options.windowEnd &&
        d.status !== "archived" &&
        (!options.projectId || d.projectId === options.projectId),
    ),
    options.accessible,
    options.role,
  );

  const rollbackDocs = await ctx.db
    .query("rollbackEvents")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  const filteredRollbacks = rollbackDocs.filter(
    (r) =>
      r.rolledBackAt >= options.windowStart &&
      r.rolledBackAt < options.windowEnd &&
      (!options.projectId || r.projectId === options.projectId),
  );

  const candidateDocs = await ctx.db
    .query("decisionCandidates")
    .withIndex("by_workspace_status", (q) =>
      q.eq("workspaceId", workspaceId).eq("status", "pending"),
    )
    .collect();

  const filteredCandidates = candidateDocs.filter(
    (c) =>
      c.createdAt >= options.windowStart &&
      c.createdAt < options.windowEnd &&
      (!options.projectId || c.projectId === options.projectId),
  );

  return {
    decisions: filteredDecisions.map((d) => {
      const record = docToDecision(d);
      return {
        title: record.title,
        summary: record.summary ?? record.rationale,
        decidedAt: record.decidedAt,
        status: record.status,
      };
    }),
    rollbacks: filteredRollbacks.map((r) => {
      const record = docToRollback(r);
      return {
        title: record.title,
        summary: record.summary ?? record.reason,
        rolledBackAt: record.rolledBackAt,
      };
    }),
    candidates: filteredCandidates.map((c) => ({
      title: c.title,
      summary: c.summary ?? c.rawTextPreview,
      confidence: c.confidence,
    })),
  };
}

export function formatImpactDecisionContextSection(
  context: ImpactDecisionContext,
): string | null {
  if (
    context.decisions.length === 0 &&
    context.rollbacks.length === 0 &&
    context.candidates.length === 0
  ) {
    return null;
  }

  const lines: string[] = [
    "",
    "Decision context (possibly related — not proved causal):",
  ];

  if (context.decisions.length > 0) {
    lines.push("Confirmed decisions in this window:");
    for (const d of context.decisions.slice(0, 5)) {
      lines.push(`- ${d.title}${d.summary ? `: ${d.summary}` : ""}`);
    }
  }

  if (context.rollbacks.length > 0) {
    lines.push("Rollbacks in this window:");
    for (const r of context.rollbacks.slice(0, 3)) {
      lines.push(`- ${r.title}${r.summary ? `: ${r.summary}` : ""}`);
    }
  }

  if (context.candidates.length > 0) {
    lines.push("Pending decision candidates:");
    for (const c of context.candidates.slice(0, 3)) {
      lines.push(`- [${c.confidence}] ${c.title}`);
    }
  }

  return lines.join("\n");
}

export function safeDecisionPreviewForAudit(
  decision: Doc<"decisions">,
): { title: string; summary?: string } {
  return {
    title: decision.title,
    summary: decision.summary ?? decision.rationale,
  };
}
