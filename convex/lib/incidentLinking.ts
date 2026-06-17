import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  linkIncidentToDecisionDoc,
  linkIncidentToEventDoc,
  linkIncidentToRollbackDoc,
  linkIncidentToWorkstreamDoc,
} from "./incidentsLib";
import {
  linkObservabilitySignalToDecisionDoc,
  linkObservabilitySignalToEventDoc,
  linkObservabilitySignalToRollbackDoc,
  linkObservabilitySignalToWorkstreamDoc,
} from "./observabilitySignalsLib";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type IncidentLinkCandidate = {
  kind: "pull_request" | "deploy" | "decision" | "workstream" | "rollback" | "event";
  id: string;
  title: string;
  confidence: "low" | "medium";
  reason: string;
};

export type IncidentLinkResult = {
  candidates: IncidentLinkCandidate[];
  metadata: {
    linkingNote: string;
    appliedLinks: Array<{ kind: IncidentLinkCandidate["kind"]; id: string }>;
  };
};

const PR_PATTERN = /(?:#|pull\/|pulls\/)(\d{1,6})\b/i;
const DEPLOY_REF_PATTERN = /\b(?:deploy(?:ment)?|release|build)\s*[:#]?\s*([a-zA-Z0-9._-]{4,})\b/i;

function extractPrNumber(text: string): string | undefined {
  const match = text.match(PR_PATTERN);
  return match?.[1];
}

function extractDeployRef(text: string): string | undefined {
  const match = text.match(DEPLOY_REF_PATTERN);
  return match?.[1];
}

function buildSearchText(
  incident: Pick<Doc<"incidents">, "title" | "summary" | "service" | "rollbackSummary">,
  signal?: Pick<Doc<"observabilitySignals">, "title" | "summary" | "metadata">,
): string {
  const parts = [
    incident.title,
    incident.summary,
    incident.service,
    incident.rollbackSummary,
    signal?.title,
    signal?.summary,
    typeof signal?.metadata === "object" && signal.metadata
      ? JSON.stringify(signal.metadata)
      : undefined,
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export async function findIncidentLinkCandidates(
  ctx: DbReadCtx,
  incident: Doc<"incidents">,
  signal?: Doc<"observabilitySignals">,
): Promise<IncidentLinkCandidate[]> {
  const searchText = buildSearchText(incident, signal);
  const candidates: IncidentLinkCandidate[] = [];
  const prNumber = extractPrNumber(searchText);
  const deployRef = extractDeployRef(searchText);

  if (prNumber) {
    const prEvents = await ctx.db
      .query("events")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", incident.workspaceId))
      .order("desc")
      .take(200);
    for (const event of prEvents) {
      if (event.entity?.type !== "pull_request") continue;
      const name = `${event.entity.name ?? ""} ${event.title}`.toLowerCase();
      if (name.includes(prNumber)) {
        candidates.push({
          kind: "pull_request",
          id: event._id,
          title: event.title,
          confidence: "medium",
          reason: `Timeline event may relate to PR #${prNumber} (heuristic text match).`,
        });
        break;
      }
    }
  }

  if (deployRef || incident.service) {
    const deploySignals = await ctx.db
      .query("observabilitySignals")
      .withIndex("by_workspace_type", (q) =>
        q.eq("workspaceId", incident.workspaceId).eq("signalType", "deploy_failed"),
      )
      .order("desc")
      .take(30);
    for (const row of deploySignals) {
      const haystack = `${row.title} ${row.summary ?? ""} ${row.fingerprint ?? ""}`.toLowerCase();
      const ref = deployRef?.toLowerCase();
      const service = incident.service?.toLowerCase();
      if ((ref && haystack.includes(ref)) || (service && row.service?.toLowerCase() === service)) {
        candidates.push({
          kind: "deploy",
          id: row._id,
          title: row.title,
          confidence: "low",
          reason: "Deploy signal may be related based on service or deploy reference overlap.",
        });
        break;
      }
    }
  }

  const recentDecisions = await ctx.db
    .query("decisions")
    .withIndex("by_workspace_created_at", (q) => q.eq("workspaceId", incident.workspaceId))
    .order("desc")
    .take(40);
  for (const decision of recentDecisions) {
    const haystack = `${decision.title} ${decision.summary ?? ""}`.toLowerCase();
    const service = incident.service?.toLowerCase();
    if (
      service &&
      haystack.includes(service) &&
      (decision.decisionType === "ops" || decision.decisionType === "engineering")
    ) {
      candidates.push({
        kind: "decision",
        id: decision._id,
        title: decision.title,
        confidence: "low",
        reason: "Decision text may mention the same service (heuristic; not confirmed).",
      });
      break;
    }
  }

  const rollbacks = await ctx.db
    .query("rollbackEvents")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", incident.workspaceId))
    .order("desc")
    .take(20);
  for (const rollback of rollbacks) {
    const haystack = `${rollback.title} ${rollback.summary ?? ""} ${rollback.reason ?? ""}`.toLowerCase();
    const service = incident.service?.toLowerCase();
    if (service && haystack.includes(service)) {
      candidates.push({
        kind: "rollback",
        id: rollback._id,
        title: rollback.title,
        confidence: "medium",
        reason: "Rollback record may mention the same service (heuristic; verify manually).",
      });
      break;
    }
  }

  if (incident.workstreamId) {
    const workstream = await ctx.db.get(incident.workstreamId);
    if (workstream) {
      candidates.push({
        kind: "workstream",
        id: workstream._id,
        title: workstream.title,
        confidence: "medium",
        reason: "Incident is already scoped to this workstream.",
      });
    }
  }

  return candidates;
}

export async function applyIncidentLinkCandidates(
  ctx: DbWriteCtx,
  incidentId: Id<"incidents">,
  signalId: Id<"observabilitySignals"> | undefined,
  candidates: IncidentLinkCandidate[],
  options?: { maxLinks?: number },
): Promise<IncidentLinkResult> {
  const maxLinks = options?.maxLinks ?? 5;
  const applied: IncidentLinkResult["metadata"]["appliedLinks"] = [];

  for (const candidate of candidates.slice(0, maxLinks)) {
    switch (candidate.kind) {
      case "decision":
        await linkIncidentToDecisionDoc(ctx, incidentId, candidate.id as Id<"decisions">);
        if (signalId) {
          await linkObservabilitySignalToDecisionDoc(
            ctx,
            signalId,
            candidate.id as Id<"decisions">,
          );
        }
        applied.push({ kind: candidate.kind, id: candidate.id });
        break;
      case "workstream":
        await linkIncidentToWorkstreamDoc(ctx, incidentId, candidate.id as Id<"workstreams">);
        if (signalId) {
          await linkObservabilitySignalToWorkstreamDoc(
            ctx,
            signalId,
            candidate.id as Id<"workstreams">,
          );
        }
        applied.push({ kind: candidate.kind, id: candidate.id });
        break;
      case "rollback":
        await linkIncidentToRollbackDoc(ctx, incidentId, candidate.id as Id<"rollbackEvents">);
        if (signalId) {
          await linkObservabilitySignalToRollbackDoc(
            ctx,
            signalId,
            candidate.id as Id<"rollbackEvents">,
          );
        }
        applied.push({ kind: candidate.kind, id: candidate.id });
        break;
      case "pull_request":
      case "event":
        await linkIncidentToEventDoc(ctx, incidentId, candidate.id as Id<"events">);
        if (signalId) {
          await linkObservabilitySignalToEventDoc(ctx, signalId, candidate.id as Id<"events">);
        }
        applied.push({ kind: candidate.kind, id: candidate.id });
        break;
      case "deploy":
        applied.push({ kind: candidate.kind, id: candidate.id });
        break;
      default:
        break;
    }
  }

  return {
    candidates,
    metadata: {
      linkingNote:
        "Links are heuristic suggestions stored for review; they do not assert causality or ownership.",
      appliedLinks: applied,
    },
  };
}

export async function inferAndApplyIncidentLinks(
  ctx: DbWriteCtx,
  incidentId: Id<"incidents">,
  signalId?: Id<"observabilitySignals">,
): Promise<IncidentLinkResult> {
  const incident = await ctx.db.get(incidentId);
  if (!incident) throw new Error("Incident not found");
  const signal = signalId ? await ctx.db.get(signalId) : undefined;
  const candidates = await findIncidentLinkCandidates(ctx, incident, signal ?? undefined);
  return applyIncidentLinkCandidates(ctx, incidentId, signalId, candidates);
}
