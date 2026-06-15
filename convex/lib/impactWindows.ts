import type { Doc } from "../_generated/dataModel";
import type { InsightWindow } from "./insightWindow";
import { windowToMs } from "./insightWindow";

export type ImpactWindowPreset = InsightWindow;

const DEFAULT_BEFORE_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export type ImpactWindowBounds = {
  beforeMs: number;
  afterMs: number;
  baselineStart: number;
  baselineEnd: number;
  impactStart: number;
  impactEnd: number;
};

export function presetToMs(preset: ImpactWindowPreset): number {
  return windowToMs(preset);
}

export function computeWindowFromAnchor(
  anchorTime: number,
  beforeMs = DEFAULT_BEFORE_MS,
  afterMs = DEFAULT_AFTER_MS,
): ImpactWindowBounds {
  return {
    beforeMs,
    afterMs,
    baselineStart: anchorTime - beforeMs,
    baselineEnd: anchorTime,
    impactStart: anchorTime,
    impactEnd: anchorTime + afterMs,
  };
}

export function resolveWorkstreamAnchorTime(workstream: Doc<"workstreams">): number {
  if (workstream.status === "completed" && workstream.endedAt) {
    return workstream.endedAt;
  }
  return workstream.startedAt;
}

export function formatWindowLabel(beforeMs: number, afterMs: number): string {
  const beforeDays = Math.round(beforeMs / (24 * 60 * 60 * 1000));
  const afterDays = Math.round(afterMs / (24 * 60 * 60 * 1000));
  return `${beforeDays}d before / ${afterDays}d after`;
}

export { DEFAULT_BEFORE_MS, DEFAULT_AFTER_MS };
