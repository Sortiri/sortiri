import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import {
  filterIncidentsByAccess,
  filterObservabilitySignalsByAccess,
} from "./incidentPermissions";
import { docToIncident } from "./incidentsLib";
import { docToObservabilitySignal } from "./observabilitySignalsLib";
import { redactObservabilityPayload } from "./observabilityRedaction";
import { docToRollback } from "./rollbackEventsLib";
import type { AccessibleProjects } from "./projectAccessLib";

type DbReadCtx = Pick<QueryCtx, "db">;

export type ImpactIncidentContext = {
  incidents: Array<{
    title: string;
    summary?: string;
    startedAt: number;
    status: string;
    severity: string;
  }>;
  signals: Array<{
    title: string;
    summary?: string;
    signalType: string;
    severity: string;
  }>;
  rollbacks: Array<{ title: string; summary?: string; rolledBackAt: number }>;
};

export async function fetchIncidentContextForImpactWindow(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  options: {
    projectId?: Id<"projects">;
    windowStart: number;
    windowEnd: number;
    accessible: AccessibleProjects;
    role: string;
  },
): Promise<ImpactIncidentContext> {
  const incidentDocs = await ctx.db
    .query("incidents")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  const filteredIncidents = filterIncidentsByAccess(
    incidentDocs.filter(
      (i) =>
        i.startedAt >= options.windowStart &&
        i.startedAt < options.windowEnd &&
        i.status !== "archived" &&
        (!options.projectId || i.projectId === options.projectId),
    ),
    options.accessible,
    options.role,
  );

  const signalDocs = await ctx.db
    .query("observabilitySignals")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  const filteredSignals = filterObservabilitySignalsByAccess(
    signalDocs.filter(
      (s) =>
        s.occurredAt >= options.windowStart &&
        s.occurredAt < options.windowEnd &&
        (!options.projectId || s.projectId === options.projectId),
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

  return {
    incidents: filteredIncidents.map((i) => {
      const record = docToIncident(i);
      return {
        title: record.title,
        summary: record.summary ?? record.rootCause,
        startedAt: record.startedAt,
        status: record.status,
        severity: record.severity,
      };
    }),
    signals: filteredSignals.map((s) => {
      const record = docToObservabilitySignal(s);
      const preview = safeObservabilitySignalPreviewForAudit(s);
      return {
        title: preview.title,
        summary: preview.summary ?? record.summary,
        signalType: record.signalType,
        severity: record.severity,
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
  };
}

export function formatImpactIncidentContextSection(
  context: ImpactIncidentContext,
): string | null {
  if (
    context.incidents.length === 0 &&
    context.signals.length === 0 &&
    context.rollbacks.length === 0
  ) {
    return null;
  }

  const lines: string[] = [
    "",
    "Incident context (possibly related — not proved causal):",
  ];

  if (context.incidents.length > 0) {
    lines.push("Incidents in this window:");
    for (const i of context.incidents.slice(0, 5)) {
      lines.push(
        `- [${i.severity}] ${i.title}${i.summary ? `: ${i.summary}` : ""}`,
      );
    }
  }

  if (context.signals.length > 0) {
    lines.push("Observability signals in this window:");
    for (const s of context.signals.slice(0, 5)) {
      lines.push(
        `- [${s.severity}/${s.signalType}] ${s.title}${s.summary ? `: ${s.summary}` : ""}`,
      );
    }
  }

  if (context.rollbacks.length > 0) {
    lines.push("Rollbacks in this window:");
    for (const r of context.rollbacks.slice(0, 3)) {
      lines.push(`- ${r.title}${r.summary ? `: ${r.summary}` : ""}`);
    }
  }

  return lines.join("\n");
}

export function safeIncidentPreviewForAudit(
  incident: Doc<"incidents">,
): { title: string; summary?: string } {
  return {
    title: incident.title,
    summary: incident.summary ?? incident.rootCause ?? incident.mitigation,
  };
}

export function safeObservabilitySignalPreviewForAudit(
  signal: Doc<"observabilitySignals">,
): { title: string; summary?: string } {
  const summary = signal.summary
    ? String(redactObservabilityPayload(signal.summary))
    : undefined;
  return {
    title: signal.title,
    summary,
  };
}
