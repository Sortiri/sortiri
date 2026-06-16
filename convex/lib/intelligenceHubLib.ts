import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { listImpactAnalysesForWorkspace } from "./impactAnalysesLib";
import {
  listFindingsForRun,
  listInsightRunsForWorkspace,
} from "./insightRunsLib";
import { listLessonsForWorkspace } from "./lessonsLib";
import { listPlaybooksForWorkspace } from "./playbooksLib";
import { listContextPacksForWorkspace } from "./contextPackLib";
import { listEvalSuitesForWorkspace } from "./evalLib";
import { listRemediationRecommendationsForWorkspace } from "./recommendationLib";
import { listRecommendationsForWorkspace } from "./recommendationLib";

type DbReadCtx = Pick<QueryCtx, "db">;

export type IntelligenceHubAreaSummary = {
  tab: "insights" | "impact" | "lessons" | "playbooks";
  count: number;
  countLabel: string;
  latestTitle?: string;
  latestAt?: number;
};

export type IntelligenceHubActivityItem = {
  type: "insight" | "impact" | "lesson" | "playbook";
  title: string;
  summary: string;
  createdAt: number;
  href: string;
};

export type IntelligenceHubResult = {
  summaries: IntelligenceHubAreaSummary[];
  recentActivity: IntelligenceHubActivityItem[];
  recentContextPacks: Array<{
    id: string;
    title: string;
    goal: string;
    createdAt: number;
  }>;
  queueSummary: {
    openCount: number;
    criticalHighCount: number;
    latestTitle?: string;
    latestAt?: number;
  };
  recentRecommendations: Array<{
    id: string;
    title: string;
    summary: string;
    priority: string;
    createdAt: number;
  }>;
  evalSummary: {
    activeCount: number;
    latestRunStatus?: string;
    latestTitle?: string;
    latestAt?: number;
  };
  remediationSummary: {
    openCount: number;
    failedEvalsNeedingAction: number;
    rerunsPassed: number;
    rerunsStillFailing: number;
  };
  recentEvalSuites: Array<{
    id: string;
    title: string;
    summary: string;
    source: string;
    createdAt: number;
  }>;
  isEmpty: boolean;
};

export async function buildIntelligenceHub(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
): Promise<IntelligenceHubResult> {
  const runs = await listInsightRunsForWorkspace(ctx, workspaceId, 20);
  const completedRun = runs.find((run) => run.status === "completed");
  const insightFindings = completedRun
    ? await listFindingsForRun(ctx, completedRun.id as Id<"insightRuns">)
    : [];

  const impactAnalyses = (await listImpactAnalysesForWorkspace(ctx, workspaceId, 100)).filter(
    (analysis) => analysis.status !== "archived",
  );
  const lessons = (await listLessonsForWorkspace(ctx, workspaceId, { status: "active", limit: 100 }));
  const playbooks = (await listPlaybooksForWorkspace(ctx, workspaceId, {
    status: "active",
    limit: 100,
  }));
  const contextPacks = await listContextPacksForWorkspace(ctx, workspaceId, 5);
  const openRecommendations = await listRecommendationsForWorkspace(ctx, workspaceId, {
    status: "open",
    limit: 100,
  });
  const recentRecommendations = openRecommendations.slice(0, 5);
  const criticalHighCount = openRecommendations.filter(
    (rec) => rec.priority === "critical" || rec.priority === "high",
  ).length;
  const latestRecommendation = openRecommendations[0];
  const activeEvalSuites = await listEvalSuitesForWorkspace(ctx, workspaceId, {
    status: "active",
    limit: 100,
  });
  const recentEvalSuites = activeEvalSuites.slice(0, 5);
  const latestEvalSuite = activeEvalSuites[0];
  const openRemediations = await listRemediationRecommendationsForWorkspace(ctx, workspaceId, {
    status: "open",
    limit: 100,
  });
  const remediationSummary = {
    openCount: openRemediations.length,
    failedEvalsNeedingAction: openRemediations.filter(
      (rec) => !rec.remediationStatus || rec.remediationStatus === "not_started",
    ).length,
    rerunsPassed: openRemediations.filter((rec) => rec.remediationStatus === "eval_rerun_passed")
      .length,
    rerunsStillFailing: openRemediations.filter(
      (rec) => rec.remediationStatus === "eval_rerun_failed",
    ).length,
  };
  let latestRunStatus: string | undefined;
  let latestEvalAt: number | undefined;
  if (latestEvalSuite) {
    const latestRun = await ctx.db
      .query("evalRuns")
      .withIndex("by_suite", (q) => q.eq("evalSuiteId", latestEvalSuite.id as Id<"evalSuites">))
      .order("desc")
      .first();
    latestRunStatus = latestRun?.status;
    latestEvalAt = latestRun?.completedAt ?? latestRun?.createdAt ?? latestEvalSuite.createdAt;
  }

  const latestInsightFinding = insightFindings[0];
  const latestImpact = impactAnalyses[0];
  const latestLesson = lessons[0];
  const latestPlaybook = playbooks[0];

  const summaries: IntelligenceHubAreaSummary[] = [
    {
      tab: "insights",
      count: insightFindings.length,
      countLabel:
        insightFindings.length === 1 ? "signal found" : "signals found",
      latestTitle: latestInsightFinding?.title,
      latestAt: latestInsightFinding?.createdAt ?? completedRun?.createdAt,
    },
    {
      tab: "impact",
      count: impactAnalyses.length,
      countLabel:
        impactAnalyses.length === 1 ? "analysis generated" : "analyses generated",
      latestTitle: latestImpact?.title,
      latestAt: latestImpact?.createdAt,
    },
    {
      tab: "lessons",
      count: lessons.length,
      countLabel: lessons.length === 1 ? "active lesson" : "active lessons",
      latestTitle: latestLesson?.title,
      latestAt: latestLesson?.createdAt,
    },
    {
      tab: "playbooks",
      count: playbooks.length,
      countLabel: playbooks.length === 1 ? "active playbook" : "active playbooks",
      latestTitle: latestPlaybook?.title,
      latestAt: latestPlaybook?.createdAt,
    },
  ];

  const recentActivity: IntelligenceHubActivityItem[] = [];

  for (const finding of insightFindings.slice(0, 5)) {
    recentActivity.push({
      type: "insight",
      title: finding.title,
      summary: finding.summary,
      createdAt: finding.createdAt,
      href: "/insights",
    });
  }

  for (const analysis of impactAnalyses.slice(0, 5)) {
    recentActivity.push({
      type: "impact",
      title: analysis.title,
      summary: analysis.summary ?? analysis.anchor.title,
      createdAt: analysis.createdAt,
      href: `/impact/${analysis.id}`,
    });
  }

  for (const lesson of lessons.slice(0, 5)) {
    recentActivity.push({
      type: "lesson",
      title: lesson.title,
      summary: lesson.summary,
      createdAt: lesson.createdAt,
      href: `/lessons/${lesson.id}`,
    });
  }

  for (const playbook of playbooks.slice(0, 5)) {
    recentActivity.push({
      type: "playbook",
      title: playbook.title,
      summary: playbook.summary,
      createdAt: playbook.createdAt,
      href: `/playbooks/${playbook.id}`,
    });
  }

  recentActivity.sort((a, b) => b.createdAt - a.createdAt);

  const isEmpty = summaries.every((summary) => summary.count === 0);

  return {
    summaries,
    recentActivity: recentActivity.slice(0, 10),
    recentContextPacks: contextPacks.map((pack) => ({
      id: pack.id,
      title: pack.title,
      goal: pack.goal,
      createdAt: pack.createdAt,
    })),
    queueSummary: {
      openCount: openRecommendations.length,
      criticalHighCount,
      latestTitle: latestRecommendation?.title,
      latestAt: latestRecommendation?.createdAt,
    },
    recentRecommendations: recentRecommendations.map((rec) => ({
      id: rec.id,
      title: rec.title,
      summary: rec.summary,
      priority: rec.priority,
      createdAt: rec.createdAt,
    })),
    evalSummary: {
      activeCount: activeEvalSuites.length,
      latestRunStatus,
      latestTitle: latestEvalSuite?.title,
      latestAt: latestEvalAt,
    },
    remediationSummary,
    recentEvalSuites: recentEvalSuites.map((suite) => ({
      id: suite.id,
      title: suite.title,
      summary: suite.summary,
      source: suite.source,
      createdAt: suite.createdAt,
    })),
    isEmpty,
  };
}
