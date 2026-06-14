import type { TimelineEvent, Workstream } from "@/types/events";
import type { InsightFindingDetail, InsightRun } from "@/types/insights";
import type { PinnedReplayWithWorkstream } from "@/types/pinned-replays";

export type PulseCounts = {
  eventsToday: number;
  agentActionsToday: number;
  codeChangesToday: number;
  productEventsToday: number;
  activeWorkstreams: number;
  connectedSources: number;
};

export type SourceHealthItem = {
  source: string;
  connected: boolean;
  eventCount: number;
  lastEventAt?: number;
};

export type CompanyPulse = {
  counts: PulseCounts;
  recentEvents: TimelineEvent[];
  activeWorkstreams: Workstream[];
  pinnedReplays: PinnedReplayWithWorkstream[];
  latestFindings: InsightFindingDetail[];
  latestInsightRun?: InsightRun;
  sourceStatus: SourceHealthItem[];
  isEmpty: boolean;
};
