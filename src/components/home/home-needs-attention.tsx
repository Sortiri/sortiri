"use client";

import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "../../../convex/_generated/api";
import { NeedsAttention, type NeedsAttentionItem } from "@/components/platform";
import { getSourceLabel } from "@/lib/events/labels";
import type { EventSource } from "@/types/events";

const OPEN_INCIDENT_STATUSES = new Set(["open", "investigating", "mitigated"]);

type HomeNeedsAttentionProps = {
  workspaceId: string;
};

export function HomeNeedsAttention({ workspaceId }: HomeNeedsAttentionProps) {
  const incidents = useQuery(api.incidents.listIncidents, {
    workspaceId,
    limit: 50,
  });

  const candidates = useQuery(api.decisions.listDecisionCandidates, {
    workspaceId,
    status: "pending",
    limit: 50,
  });

  const sourceHealth = useQuery(api.integrations.health.getSourceHealth, {
    workspaceId,
  });

  const hub = useQuery(api.intelligenceHub.getHub, { workspaceId });

  const items = useMemo(() => {
    const attention: NeedsAttentionItem[] = [];

    const openIncidents = (incidents ?? []).filter((incident) =>
      OPEN_INCIDENT_STATUSES.has(incident.status),
    );
    if (openIncidents.length > 0) {
      attention.push({
        id: "open-incidents",
        label: `${openIncidents.length} open incident${openIncidents.length === 1 ? "" : "s"} need review`,
        href: "/timeline/incidents",
        severity: "error",
      });
    }

    const pendingCandidates = candidates ?? [];
    if (pendingCandidates.length > 0) {
      attention.push({
        id: "decision-candidates",
        label: `${pendingCandidates.length} decision candidate${pendingCandidates.length === 1 ? "" : "s"} awaiting confirmation`,
        href: "/timeline/decisions",
        severity: "warning",
      });
    }

    for (const entry of sourceHealth ?? []) {
      const sourceLabel = getSourceLabel(entry.source as EventSource);
      if ((entry.deadLetters ?? 0) > 0) {
        attention.push({
          id: `dead-letters-${entry.source}`,
          label: `${entry.deadLetters} dead letter${entry.deadLetters === 1 ? "" : "s"} for ${sourceLabel}`,
          href: "/sources/reliability/dead-letters",
          severity: "error",
        });
        continue;
      }
      if (entry.deliveryHealth === "degraded" || entry.deliveryHealth === "error") {
        attention.push({
          id: `delivery-${entry.source}`,
          label: `${sourceLabel} ingest is ${entry.deliveryHealth}`,
          href: "/sources/reliability",
          severity: entry.deliveryHealth === "error" ? "error" : "warning",
        });
        continue;
      }
      if (entry.status === "error") {
        attention.push({
          id: `source-error-${entry.source}`,
          label: `${sourceLabel} connection error`,
          href: "/sources",
          severity: "error",
        });
      }
    }

    const failedEvals = hub?.remediationSummary?.failedEvalsNeedingAction ?? 0;
    if (failedEvals > 0) {
      attention.push({
        id: "failed-evals",
        label: `${failedEvals} failed eval${failedEvals === 1 ? "" : "s"} need remediation`,
        href: "/intelligence/queue",
        severity: "warning",
      });
    }

    return attention;
  }, [incidents, candidates, sourceHealth, hub]);

  return <NeedsAttention items={items} />;
}
